import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const queueSchema = z.object({
  leadId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  scheduledAt: z.string().datetime().optional(),
});

/** Enqueues an outbound email for the worker to send (compliance re-checked at send time). */
export const queueLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => queueSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, workspace_id, email, do_not_contact")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");
    if (lead.do_not_contact) throw new Error("This lead is marked do-not-contact.");

    const { data: blocked } = await supabase
      .from("suppression_list")
      .select("reason")
      .eq("workspace_id", lead.workspace_id)
      .eq("email", lead.email.toLowerCase())
      .maybeSingle();
    if (blocked) {
      throw new Error(`This address is suppressed (${blocked.reason}) and cannot be emailed.`);
    }

    const scheduledAt = data.scheduledAt ?? new Date().toISOString();
    const idempotencyKey = `${lead.id}:${scheduledAt}:${data.subject}`.slice(0, 240);

    const { data: row, error: insertError } = await supabase
      .from("email_queue")
      .insert({
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        sender_id: userId,
        to_email: lead.email,
        subject: data.subject,
        body_text: data.body,
        status: "queued",
        scheduled_at: scheduledAt,
        idempotency_key: idempotencyKey,
      })
      .select("id, status, scheduled_at")
      .single();
    if (insertError) throw new Error(insertError.message);

    return row;
  });

/** Queue health for the current workspace. */
export const getQueueStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("email_queue")
      .select("status")
      .eq("workspace_id", data.workspaceId)
      .limit(1000);
    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const r of rows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  });
