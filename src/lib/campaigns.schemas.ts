import { z } from "zod";

export const campaignInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  goal: z.enum(["intro", "follow_up", "book_meeting", "re_engage"]).default("book_meeting"),
});

export const campaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
});

export const stepSchema = z.object({
  waitHours: z.number().int().min(0).max(24 * 60),
  goal: z.enum(["intro", "follow_up", "book_meeting", "re_engage"]),
  tone: z.enum(["friendly", "direct", "consultative"]),
  subjectTemplate: z.string().trim().max(200).optional(),
  bodyTemplate: z.string().trim().max(5000).optional(),
  useAi: z.boolean().default(true),
});

export const sequenceInputSchema = z.object({
  workspaceId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  stopOnReply: z.boolean().default(true),
  steps: z.array(stepSchema).min(1).max(10),
});

export const enrollSchema = z.object({
  workspaceId: z.string().uuid(),
  sequenceId: z.string().uuid(),
  leadIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  filter: z
    .object({
      status: z
        .enum(["new", "contacted", "qualified", "mql", "sql", "meeting", "won", "lost"])
        .optional(),
      minScore: z.number().int().min(0).max(100).optional(),
      limit: z.number().int().min(1).max(500).default(100),
    })
    .optional(),
});

export const importSchema = z.object({
  workspaceId: z.string().uuid(),
  filename: z.string().trim().max(200).optional(),
  source: z
    .enum(["website_form", "chatbot", "webinar", "referral", "paid_ads", "outbound", "other"])
    .default("outbound"),
  rows: z
    .array(
      z.object({
        firstName: z.string().trim().max(80).optional(),
        lastName: z.string().trim().max(80).optional(),
        email: z.string().trim().max(255).optional(),
        phone: z.string().trim().max(40).optional(),
        company: z.string().trim().max(160).optional(),
        companySize: z.string().trim().max(60).optional(),
        jobTitle: z.string().trim().max(120).optional(),
        country: z.string().trim().max(80).optional(),
        linkedinUrl: z.string().trim().max(300).optional(),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

export const workspaceScopeSchema = z.object({ workspaceId: z.string().uuid() });

export const sequenceActiveSchema = z.object({
  workspaceId: z.string().uuid(),
  sequenceId: z.string().uuid(),
  isActive: z.boolean(),
});
