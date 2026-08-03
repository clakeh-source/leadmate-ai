import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    subject?: string;
    to?: string[] | string;
    from?: string;
    text?: string;
    click?: { link?: string };
  };
};

/** Svix signature verification (Resend signs webhooks with Svix). */
function verifySvix(secret: string, headers: Headers, payload: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signatureHeader.split(" ").some((part) => {
    const value = part.split(",")[1];
    if (!value) return false;
    const buf = Buffer.from(value);
    return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
  });
}

const EVENT_MAP: Record<string, { status: string; title: string; type: string }> = {
  "email.delivered": { status: "delivered", title: "Email delivered", type: "email_delivered" },
  "email.opened": { status: "opened", title: "Email opened", type: "email_opened" },
  "email.clicked": { status: "clicked", title: "Email link clicked", type: "email_clicked" },
  "email.bounced": { status: "bounced", title: "Email bounced", type: "email_bounced" },
  "email.complained": { status: "complained", title: "Spam complaint", type: "email_complaint" },
  "email.delivery_delayed": { status: "delayed", title: "Email delayed", type: "email_delayed" },
};

export const Route = createFileRoute("/api/public/webhooks/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        if (!verifySvix(secret, request.headers, payload)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: ResendEvent;
        try {
          event = JSON.parse(payload) as ResendEvent;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const messageId = event.data?.email_id ?? null;
        const type = event.type ?? "";

        // Inbound reply (Resend inbound email)
        if (type === "email.received") {
          const fromAddress = (event.data?.from ?? "").match(/[^<\s]+@[^>\s]+/)?.[0]?.toLowerCase();
          if (!fromAddress) return new Response("ok");
          const { data: lead } = await supabaseAdmin
            .from("leads")
            .select("id")
            .ilike("email", fromAddress)
            .maybeSingle();
          if (!lead) return new Response("ok");

          await supabaseAdmin.from("lead_activities").insert({
            lead_id: lead.id,
            type: "email_replied",
            title: `Lead replied — ${event.data?.subject ?? "(no subject)"}`,
            body: event.data?.text ?? null,
            metadata: { provider: "resend", from: fromAddress },
          });
          await supabaseAdmin
            .from("lead_emails")
            .update({ status: "replied", replied_at: new Date().toISOString() })
            .eq("to_email", fromAddress)
            .neq("status", "replied");
          return new Response("ok");
        }

        const mapped = EVENT_MAP[type];
        if (!mapped || !messageId) return new Response("ok");

        const { data: emailRow } = await supabaseAdmin
          .from("lead_emails")
          .select("id, lead_id, subject, status")
          .eq("provider_message_id", messageId)
          .maybeSingle();
        if (!emailRow) return new Response("ok");

        const update: { status: string; opened_at?: string } = { status: mapped.status };
        if (mapped.status === "opened") update.opened_at = new Date().toISOString();

        // Don't downgrade a stronger signal
        if (!(emailRow.status === "opened" && mapped.status === "delivered")) {
          await supabaseAdmin.from("lead_emails").update(update).eq("id", emailRow.id);
        }

        await supabaseAdmin.from("lead_activities").insert({
          lead_id: emailRow.lead_id,
          type: mapped.type,
          title: `${mapped.title} — ${emailRow.subject}`,
          metadata: {
            provider: "resend",
            provider_message_id: messageId,
            link: event.data?.click?.link ?? null,
          },
        });

        return new Response("ok");
      },
    },
  },
});
