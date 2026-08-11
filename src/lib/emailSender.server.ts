// Server-only helpers shared by the email queue worker.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const toHtml = (body: string) =>
  `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827">${body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("")}</div>`;

export interface SendResult {
  ok: boolean;
  providerMessageId?: string | null;
  status?: number;
  errorCode?: string;
  errorMessage?: string;
}

/** Sends one email through the Resend connector gateway. Never throws. */
export async function sendViaResend(params: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  leadId: string;
}): Promise<SendResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    return { ok: false, errorCode: "not_configured", errorMessage: "Email sending is not configured" };
  }

  const from = process.env["RESEND_FROM_EMAIL"] ?? "LeadFlow AI <onboarding@resend.dev>";

  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html ?? toHtml(params.text),
        text: params.text,
        tags: [{ name: "lead_id", value: params.leadId.replace(/-/g, "_") }],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Resend send failed [${res.status}]: ${errorBody}`);
      return {
        ok: false,
        status: res.status,
        errorCode: `http_${res.status}`,
        errorMessage: errorBody.slice(0, 500),
      };
    }

    const sent = (await res.json()) as { id?: string };
    return { ok: true, providerMessageId: sent.id ?? null, status: res.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Resend send threw: ${message}`);
    return { ok: false, errorCode: "network_error", errorMessage: message.slice(0, 500) };
  }
}

interface QueueRow {
  id: string;
  workspace_id: string;
  lead_id: string;
  sender_id: string | null;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  attempt_count: number;
  max_attempts: number;
}

const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

/** Drains up to `limit` due messages from email_queue. Returns a processing summary. */
export async function drainEmailQueue(limit = 25) {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("email_queue")
    .select(
      "id, workspace_id, lead_id, sender_id, to_email, subject, body_text, body_html, attempt_count, max_attempts",
    )
    .eq("status", "queued")
    .lte("scheduled_at", nowIso)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("scheduled_at", { ascending: true })
    .limit(limit)
    .returns<QueueRow[]>();

  if (error) throw error;

  let sent = 0;
  let failed = 0;
  let suppressed = 0;

  const dailyCounts = new Map<string, { used: number; limit: number }>();

  for (const row of due ?? []) {
    // Claim the row (optimistic lock: only if still queued).
    const { data: claimed } = await supabaseAdmin
      .from("email_queue")
      .update({ status: "processing", processing_started_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // Compliance re-check at send time.
    const [{ data: lead }, { data: block }] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("id, do_not_contact")
        .eq("id", row.lead_id)
        .maybeSingle(),
      supabaseAdmin
        .from("suppression_list")
        .select("reason")
        .eq("workspace_id", row.workspace_id)
        .eq("email", row.to_email.toLowerCase())
        .maybeSingle(),
    ]);

    if (lead?.do_not_contact || block) {
      suppressed++;
      await supabaseAdmin
        .from("email_queue")
        .update({
          status: "suppressed",
          last_error_code: "suppressed",
          last_error_message: block ? `Suppressed (${block.reason})` : "Lead is do-not-contact",
        })
        .eq("id", row.id);
      await supabaseAdmin.from("email_events").insert({
        workspace_id: row.workspace_id,
        email_queue_id: row.id,
        lead_id: row.lead_id,
        event_type: "unsubscribed",
        metadata: { reason: block?.reason ?? "do_not_contact" },
      });
      continue;
    }

    // Per-workspace daily cap.
    let counts = dailyCounts.get(row.workspace_id);
    if (!counts) {
      const [{ data: used }, { data: ws }] = await Promise.all([
        supabaseAdmin.rpc("workspace_emails_sent_today", { _workspace_id: row.workspace_id }),
        supabaseAdmin
          .from("workspaces")
          .select("daily_email_limit")
          .eq("id", row.workspace_id)
          .maybeSingle(),
      ]);
      counts = { used: used ?? 0, limit: ws?.daily_email_limit ?? 200 };
      dailyCounts.set(row.workspace_id, counts);
    }
    if (counts.used >= counts.limit) {
      const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from("email_queue")
        .update({
          status: "queued",
          next_retry_at: retryAt,
          last_error_code: "daily_limit",
          last_error_message: `Daily limit of ${counts.limit} reached`,
        })
        .eq("id", row.id);
      continue;
    }

    const result = await sendViaResend({
      to: row.to_email,
      subject: row.subject,
      text: row.body_text,
      html: row.body_html,
      leadId: row.lead_id,
    });

    const attempt = row.attempt_count + 1;

    if (result.ok) {
      sent++;
      counts.used++;
      const sentAt = new Date().toISOString();

      await supabaseAdmin
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: sentAt,
          attempt_count: attempt,
          provider_message_id: result.providerMessageId ?? null,
          last_error_code: null,
          last_error_message: null,
        })
        .eq("id", row.id);

      const { data: emailRow } = await supabaseAdmin
        .from("lead_emails")
        .insert({
          workspace_id: row.workspace_id,
          lead_id: row.lead_id,
          sender_id: row.sender_id,
          to_email: row.to_email,
          subject: row.subject,
          body: row.body_text,
          provider_message_id: result.providerMessageId ?? null,
          status: "sent",
        })
        .select("id")
        .maybeSingle();

      await supabaseAdmin.from("email_events").insert({
        workspace_id: row.workspace_id,
        email_queue_id: row.id,
        lead_id: row.lead_id,
        provider_event_id: result.providerMessageId ?? null,
        event_type: "sent",
        metadata: { lead_email_id: emailRow?.id ?? null },
      });

      await supabaseAdmin.from("lead_activities").insert({
        workspace_id: row.workspace_id,
        lead_id: row.lead_id,
        actor_id: row.sender_id,
        type: "email_sent",
        title: `Email sent — ${row.subject}`,
        body: row.body_text,
        metadata: {
          provider: "resend",
          provider_message_id: result.providerMessageId ?? null,
          lead_email_id: emailRow?.id ?? null,
          to: row.to_email,
          via: "queue",
        },
      });

      await supabaseAdmin
        .from("leads")
        .update({ last_contacted_at: sentAt })
        .eq("id", row.lead_id);
      continue;
    }

    failed++;
    const exhausted = attempt >= row.max_attempts;
    const backoff = BACKOFF_MINUTES[Math.min(attempt - 1, BACKOFF_MINUTES.length - 1)] ?? 60;

    await supabaseAdmin
      .from("email_queue")
      .update({
        status: exhausted ? "failed" : "queued",
        attempt_count: attempt,
        failed_at: exhausted ? new Date().toISOString() : null,
        next_retry_at: exhausted ? null : new Date(Date.now() + backoff * 60 * 1000).toISOString(),
        last_error_code: result.errorCode ?? "unknown",
        last_error_message: result.errorMessage ?? null,
      })
      .eq("id", row.id);

    if (exhausted) {
      await supabaseAdmin.from("email_events").insert({
        workspace_id: row.workspace_id,
        email_queue_id: row.id,
        lead_id: row.lead_id,
        event_type: "failed",
        metadata: { error_code: result.errorCode ?? "unknown", attempts: attempt },
      });
    }
  }

  return { processed: due?.length ?? 0, sent, failed, suppressed };
}

interface EnrollmentRow {
  id: string;
  workspace_id: string;
  sequence_id: string;
  campaign_id: string | null;
  lead_id: string;
  enrolled_by: string | null;
  current_step: number;
}

const renderTemplate = (template: string, lead: Record<string, unknown>) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const value = lead[key];
    return value == null ? "" : String(value);
  });

async function writeAiStep(params: {
  goal: string;
  tone: string;
  lead: {
    first_name: string;
    last_name: string | null;
    company: string | null;
    company_size: string | null;
    job_title: string | null;
    industry: string | null;
    notes: string | null;
    score: number;
  };
}): Promise<{ subject: string; body: string } | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;
  const { lead } = params;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              'You are an expert B2B SDR writing one step of a multi-touch outreach sequence. Short, specific, human, max 110 words. Never invent facts. Return strict JSON: {"subject": string, "body": string}.',
          },
          {
            role: "user",
            content: `Goal: ${params.goal}. Tone: ${params.tone}.
Lead: ${lead.first_name} ${lead.last_name ?? ""}, ${lead.job_title ?? "unknown role"} at ${lead.company ?? "unknown company"} (${lead.company_size ?? "unknown size"}, ${lead.industry ?? "unknown industry"}). Score ${lead.score}/100. Stated need: ${lead.notes ?? "none"}.
Our product: LeadFlow AI — an AI-assisted SDR platform.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      subject?: string;
      body?: string;
    };
    if (!parsed.body) return null;
    return { subject: parsed.subject ?? "Quick question", body: parsed.body };
  } catch (error) {
    console.error(`Sequence AI step failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Advances due sequence enrollments: writes the next step (AI or template) into
 * the email queue, then schedules the following step. Stops on reply, suppression
 * or do-not-contact.
 */
export async function advanceSequences(limit = 50) {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("sequence_enrollments")
    .select("id, workspace_id, sequence_id, campaign_id, lead_id, enrolled_by, current_step")
    .eq("status", "active")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(limit)
    .returns<EnrollmentRow[]>();
  if (error) throw error;

  let queued = 0;
  let completed = 0;
  let stopped = 0;

  for (const enrollment of due ?? []) {
    const [{ data: sequence }, { data: lead }] = await Promise.all([
      supabaseAdmin
        .from("sequences")
        .select("id, is_active, stop_on_reply, sequence_steps(id, step_order, wait_hours, goal, tone, subject_template, body_template, use_ai)")
        .eq("id", enrollment.sequence_id)
        .maybeSingle(),
      supabaseAdmin
        .from("leads")
        .select("id, first_name, last_name, email, company, company_size, job_title, industry, notes, score, do_not_contact")
        .eq("id", enrollment.lead_id)
        .maybeSingle(),
    ]);

    if (!sequence?.is_active || !lead) {
      await supabaseAdmin
        .from("sequence_enrollments")
        .update({ status: "paused" })
        .eq("id", enrollment.id);
      continue;
    }

    const { data: suppressed } = await supabaseAdmin
      .from("suppression_list")
      .select("reason")
      .eq("workspace_id", enrollment.workspace_id)
      .eq("email", lead.email.toLowerCase())
      .maybeSingle();

    let shouldStop = lead.do_not_contact || !!suppressed;

    if (!shouldStop && sequence.stop_on_reply) {
      const { data: replied } = await supabaseAdmin
        .from("email_events")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("event_type", "replied")
        .limit(1)
        .maybeSingle();
      if (replied) shouldStop = true;
    }

    if (shouldStop) {
      stopped++;
      await supabaseAdmin
        .from("sequence_enrollments")
        .update({ status: "stopped", completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      continue;
    }

    const steps = [...(sequence.sequence_steps ?? [])].sort((a, b) => a.step_order - b.step_order);
    const nextStep = steps[enrollment.current_step];

    if (!nextStep) {
      completed++;
      await supabaseAdmin
        .from("sequence_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      continue;
    }

    const context = {
      first_name: lead.first_name,
      last_name: lead.last_name ?? "",
      company: lead.company ?? "",
      job_title: lead.job_title ?? "",
      industry: lead.industry ?? "",
    };

    let subject: string | null = nextStep.subject_template
      ? renderTemplate(nextStep.subject_template, context)
      : null;
    let body: string | null = nextStep.body_template
      ? renderTemplate(nextStep.body_template, context)
      : null;

    if (nextStep.use_ai || !body) {
      const drafted = await writeAiStep({
        goal: nextStep.goal,
        tone: nextStep.tone,
        lead: {
          first_name: lead.first_name,
          last_name: lead.last_name,
          company: lead.company,
          company_size: lead.company_size,
          job_title: lead.job_title,
          industry: lead.industry,
          notes: lead.notes,
          score: lead.score,
        },
      });
      if (drafted) {
        subject = subject ?? drafted.subject;
        body = drafted.body;
      }
    }

    if (!body) {
      await supabaseAdmin
        .from("sequence_enrollments")
        .update({
          next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          last_error: "Could not compose step content",
        })
        .eq("id", enrollment.id);
      continue;
    }

    const stepNumber = enrollment.current_step + 1;
    const { error: queueError } = await supabaseAdmin.from("email_queue").insert({
      workspace_id: enrollment.workspace_id,
      lead_id: lead.id,
      campaign_id: enrollment.campaign_id,
      sequence_id: sequence.id,
      sequence_step_id: nextStep.id,
      sender_id: enrollment.enrolled_by,
      to_email: lead.email,
      subject: subject ?? "Quick question",
      body_text: body,
      body_html: toHtml(body),
      status: "queued",
      scheduled_at: new Date().toISOString(),
      idempotency_key: `${enrollment.id}:${nextStep.id}`,
    });

    if (queueError && !queueError.message.includes("duplicate")) {
      await supabaseAdmin
        .from("sequence_enrollments")
        .update({
          next_run_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          last_error: queueError.message.slice(0, 300),
        })
        .eq("id", enrollment.id);
      continue;
    }

    queued++;
    const followingStep = steps[stepNumber];
    await supabaseAdmin
      .from("sequence_enrollments")
      .update({
        current_step: stepNumber,
        last_error: null,
        status: followingStep ? "active" : "completed",
        completed_at: followingStep ? null : new Date().toISOString(),
        next_run_at: new Date(
          Date.now() + (followingStep?.wait_hours ?? 0) * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("id", enrollment.id);

    await supabaseAdmin.from("lead_activities").insert({
      workspace_id: enrollment.workspace_id,
      lead_id: lead.id,
      actor_id: enrollment.enrolled_by,
      type: "sequence_step",
      title: `Sequence step ${stepNumber} queued — ${subject ?? ""}`,
      body,
      metadata: { sequence_id: sequence.id, step_id: nextStep.id },
    });
  }

  return { due: due?.length ?? 0, queued, completed, stopped };
}
