import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  leadId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toHtml = (body: string) =>
  `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827">${body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("")}</div>`;

export const sendLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, marketing_consent")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) throw new Error("Email sending is not configured");

    const from = process.env["RESEND_FROM_EMAIL"] ?? "LeadFlow AI <onboarding@resend.dev>";

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from,
        to: [lead.email],
        subject: data.subject,
        html: toHtml(data.body),
        text: data.body,
        tags: [{ name: "lead_id", value: lead.id.replace(/-/g, "_") }],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Resend send failed [${res.status}]: ${errorBody}`);
      throw new Error(`Email provider rejected the send [${res.status}]: ${errorBody}`);
    }

    const sent = (await res.json()) as { id?: string };

    const { data: row } = await supabase
      .from("lead_emails")
      .insert({
        lead_id: lead.id,
        sender_id: userId,
        to_email: lead.email,
        subject: data.subject,
        body: data.body,
        provider_message_id: sent.id ?? null,
        status: "sent",
      })
      .select("id")
      .maybeSingle();

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      actor_id: userId,
      type: "email_sent",
      title: `Email sent — ${data.subject}`,
      body: data.body,
      metadata: {
        provider: "resend",
        provider_message_id: sent.id ?? null,
        lead_email_id: row?.id ?? null,
        to: lead.email,
      },
    });

    await supabase
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", lead.id);

    return { id: sent.id ?? null, to: lead.email };
  });
