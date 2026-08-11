import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  campaignInputSchema,
  campaignStatusSchema,
  enrollSchema,
  sequenceActiveSchema,
  sequenceInputSchema,
  workspaceScopeSchema,
} from "@/lib/campaigns.schemas";

/** Campaigns with their sequences, step counts and live enrollment totals. */
export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workspaceScopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: campaigns, error }, { data: sequences }, { data: enrollments }] =
      await Promise.all([
        supabase
          .from("campaigns")
          .select("id, name, description, status, goal, created_at")
          .eq("workspace_id", data.workspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("sequences")
          .select("id, campaign_id, name, stop_on_reply, is_active, sequence_steps(id, step_order, wait_hours, goal, tone, use_ai)")
          .eq("workspace_id", data.workspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("sequence_enrollments")
          .select("sequence_id, status")
          .eq("workspace_id", data.workspaceId)
          .limit(5000),
      ]);
    if (error) throw error;

    const counts: Record<string, { active: number; completed: number; total: number }> = {};
    for (const row of enrollments ?? []) {
      const bucket = (counts[row.sequence_id] ??= { active: 0, completed: 0, total: 0 });
      bucket.total++;
      if (row.status === "active") bucket.active++;
      if (row.status === "completed") bucket.completed++;
    }

    return {
      campaigns: campaigns ?? [],
      sequences: (sequences ?? []).map((s) => ({
        ...s,
        steps: [...(s.sequence_steps ?? [])].sort((a, b) => a.step_order - b.step_order),
        enrollments: counts[s.id] ?? { active: 0, completed: 0, total: 0 },
      })),
    };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => campaignInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        description: data.description ?? null,
        goal: data.goal,
        created_by: context.userId,
      })
      .select("id, name, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => campaignStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.campaignId)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Creates a sequence and its ordered steps together. */
export const createSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sequenceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: sequence, error } = await supabase
      .from("sequences")
      .insert({
        workspace_id: data.workspaceId,
        campaign_id: data.campaignId ?? null,
        name: data.name,
        stop_on_reply: data.stopOnReply,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: stepError } = await supabase.from("sequence_steps").insert(
      data.steps.map((step, index) => ({
        workspace_id: data.workspaceId,
        sequence_id: sequence.id,
        step_order: index + 1,
        wait_hours: step.waitHours,
        goal: step.goal,
        tone: step.tone,
        subject_template: step.subjectTemplate ?? null,
        body_template: step.bodyTemplate ?? null,
        use_ai: step.useAi,
      })),
    );
    if (stepError) {
      await supabase.from("sequences").delete().eq("id", sequence.id);
      throw new Error(stepError.message);
    }

    return { id: sequence.id, steps: data.steps.length };
  });

/** Enrolls leads into a sequence, skipping suppressed, do-not-contact and already-enrolled leads. */
export const enrollLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => enrollSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sequence, error: seqError } = await supabase
      .from("sequences")
      .select("id, campaign_id, is_active")
      .eq("id", data.sequenceId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (seqError) throw seqError;
    if (!sequence) throw new Error("Sequence not found");

    let leadQuery = supabase
      .from("leads")
      .select("id, email, do_not_contact")
      .eq("workspace_id", data.workspaceId)
      .eq("do_not_contact", false);

    if (data.leadIds?.length) {
      leadQuery = leadQuery.in("id", data.leadIds);
    } else {
      const filter = data.filter ?? { limit: 100 };
      if (filter.status) leadQuery = leadQuery.eq("status", filter.status);
      if (typeof filter.minScore === "number") leadQuery = leadQuery.gte("score", filter.minScore);
      leadQuery = leadQuery.order("score", { ascending: false }).limit(filter.limit ?? 100);
    }

    const { data: leads, error: leadError } = await leadQuery;
    if (leadError) throw leadError;
    if (!leads?.length) return { enrolled: 0, skipped: 0, suppressed: 0 };

    const { data: suppressed } = await supabase
      .from("suppression_list")
      .select("email")
      .eq("workspace_id", data.workspaceId)
      .in(
        "email",
        leads.map((l) => l.email.toLowerCase()),
      );
    const blocked = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()));

    const { data: already } = await supabase
      .from("sequence_enrollments")
      .select("lead_id")
      .eq("sequence_id", data.sequenceId);
    const enrolledIds = new Set((already ?? []).map((e) => e.lead_id));

    const candidates = leads.filter(
      (l) => !blocked.has(l.email.toLowerCase()) && !enrolledIds.has(l.id),
    );

    if (!candidates.length) {
      return { enrolled: 0, skipped: leads.length - blocked.size, suppressed: blocked.size };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("sequence_enrollments")
      .insert(
        candidates.map((lead) => ({
          workspace_id: data.workspaceId,
          sequence_id: data.sequenceId,
          campaign_id: sequence.campaign_id,
          lead_id: lead.id,
          enrolled_by: userId,
          next_run_at: new Date().toISOString(),
        })),
      )
      .select("id");
    if (insertError) throw new Error(insertError.message);

    await supabase.from("lead_activities").insert(
      candidates.map((lead) => ({
        workspace_id: data.workspaceId,
        lead_id: lead.id,
        actor_id: userId,
        type: "sequence_enrolled",
        title: "Enrolled in outreach sequence",
        metadata: { sequence_id: data.sequenceId },
      })),
    );

    return {
      enrolled: inserted?.length ?? 0,
      skipped: leads.length - candidates.length - blocked.size,
      suppressed: blocked.size,
    };
  });

/** Pauses or resumes a sequence and its active enrollments. */
export const setSequenceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sequenceActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sequences")
      .update({ is_active: data.isActive })
      .eq("id", data.sequenceId)
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("sequence_enrollments")
      .update({ status: data.isActive ? "active" : "paused" })
      .eq("sequence_id", data.sequenceId)
      .in("status", data.isActive ? ["paused"] : ["active"]);

    return { isActive: data.isActive };
  });
