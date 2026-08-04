import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const publicLeadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(1).max(120),
  companySize: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
  marketingConsent: z.boolean(),
  source: z.enum(["website_form", "chatbot"]).default("website_form"),
});

/**
 * Public inbound lead capture.
 * Anonymous visitors cannot write to `leads` directly (workspace RLS), so this
 * endpoint validates, deduplicates and routes the submission into the
 * destination workspace with a full consent record.
 */
export const captureInboundLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicLeadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const domain = email.split("@")[1] ?? null;
    const freeDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
    const companyDomain = domain && !freeDomains.includes(domain) ? domain : null;

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (wsError) throw wsError;
    if (!workspace) throw new Error("No destination workspace is configured");

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const now = new Date().toISOString();

    // Deduplicate on normalized email within the workspace
    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("normalized_email", email)
      .maybeSingle();

    let leadId: string;
    let duplicate = false;

    if (existing) {
      duplicate = true;
      leadId = existing.id;
      await supabaseAdmin
        .from("leads")
        .update({
          first_name: data.firstName,
          last_name: data.lastName || null,
          company: data.company,
          company_size: data.companySize || null,
          notes: data.notes || null,
          marketing_consent: data.marketingConsent,
          ...(data.marketingConsent ? { consent_at: now, consent_ip: ip } : {}),
        })
        .eq("id", leadId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("leads")
        .insert({
          workspace_id: workspace.id,
          first_name: data.firstName,
          last_name: data.lastName || null,
          email: data.email,
          company: data.company,
          company_domain: companyDomain,
          company_size: data.companySize || null,
          notes: data.notes || null,
          source: data.source,
          marketing_consent: data.marketingConsent,
          consent_at: data.marketingConsent ? now : null,
          consent_ip: data.marketingConsent ? ip : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      leadId = inserted.id;
    }

    await supabaseAdmin.from("lead_consents").insert({
      workspace_id: workspace.id,
      lead_id: leadId,
      consent_type: "marketing_email",
      lawful_basis: data.marketingConsent ? "consent" : "legitimate_interest",
      consent_status: data.marketingConsent ? "granted" : "not_required",
      source: data.source,
      consent_text_version: "v1",
      captured_at: now,
      metadata: { ip },
    });

    await supabaseAdmin.from("lead_activities").insert({
      workspace_id: workspace.id,
      lead_id: leadId,
      type: duplicate ? "form_resubmitted" : "lead_captured",
      title: duplicate
        ? "Existing lead re-submitted the demo form"
        : "Lead captured from the website demo form",
      body: data.notes || null,
      metadata: { source: data.source, marketing_consent: data.marketingConsent },
    });

    return { ok: true, duplicate };
  });
