import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  leadId: z.string().uuid(),
  tone: z.enum(["friendly", "direct", "consultative"]).default("consultative"),
  goal: z.enum(["intro", "follow_up", "book_meeting", "re_engage"]).default("book_meeting"),
});

export const generateLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error } = await supabase
      .from("leads")
      .select(
        "id, workspace_id, first_name, last_name, company, company_size, job_title, country, source, status, score, notes",
      )
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const goalText: Record<string, string> = {
      intro: "a first-touch introduction",
      follow_up: "a follow-up after an earlier touch",
      book_meeting: "booking a 20-minute discovery call",
      re_engage: "re-engaging a lead that went quiet",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert B2B SDR. Write short, specific, human outreach emails. No fluff, no cliches, max 120 words. Never invent facts not present in the lead context. Return strict JSON: {\"subject\": string, \"body\": string}.",
          },
          {
            role: "user",
            content: `Write ${goalText[data.goal]} email in a ${data.tone} tone.

Lead context:
- Name: ${lead.first_name} ${lead.last_name ?? ""}
- Job title: ${lead.job_title ?? "unknown"}
- Company: ${lead.company ?? "unknown"} (${lead.company_size ?? "unknown size"})
- Country: ${lead.country ?? "unknown"}
- Lead source: ${lead.source}
- Pipeline status: ${lead.status}
- Qualification score: ${lead.score}/100
- Stated need: ${lead.notes ?? "none provided"}

Our product: LeadFlow AI — an AI-assisted SDR platform that captures, scores, and nurtures inbound leads and hands them to humans for closing.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { subject?: string; body?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { subject: "Quick question", body: raw };
    }

    const subject = parsed.subject ?? "Quick question";
    const body = parsed.body ?? "";

    await supabase.from("lead_activities").insert({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      actor_id: context.userId,
      type: "ai_email",
      title: `AI email drafted — ${subject}`,
      body,
      metadata: { tone: data.tone, goal: data.goal },
    });

    return { subject, body };
  });
