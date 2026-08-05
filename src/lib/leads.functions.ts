import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables } from "@/integrations/supabase/types";

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "mql",
  "sql",
  "meeting",
  "won",
  "lost",
] as const;

const listSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(5).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  status: z.enum(STATUSES).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  sort: z.enum(["created_at", "score", "last_touch_at"]).default("created_at"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type LeadRow = Pick<
  Tables<"leads">,
  | "id"
  | "workspace_id"
  | "first_name"
  | "last_name"
  | "email"
  | "company"
  | "company_size"
  | "source"
  | "status"
  | "score"
  | "score_breakdown"
  | "notes"
  | "marketing_consent"
  | "do_not_contact"
  | "created_at"
  | "last_contacted_at"
>;

export interface LeadPage {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SELECT_COLUMNS =
  "id, workspace_id, first_name, last_name, email, company, company_size, source, status, score, score_breakdown, notes, marketing_consent, do_not_contact, created_at, last_contacted_at";

/** Server-side paginated, filtered and sorted lead list (RLS-scoped to the caller's workspaces). */
export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<LeadPage> => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = context.supabase
      .from("leads")
      .select(SELECT_COLUMNS as string, { count: "exact" })
      .order(data.sort, { ascending: data.direction === "asc" })
      .range(from, to);

    if (data.status) query = query.eq("status", data.status);
    if (typeof data.minScore === "number") query = query.gte("score", data.minScore);
    if (data.search) {
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        const like = `%${term}%`;
        query = query.or(
          `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},company.ilike.${like}`,
        );
      }
    }

    const { data: rows, count, error } = await query.returns<LeadRow[]>();
    if (error) throw error;

    return {
      rows: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).optional(),
});

/** Atomic status change: lead update + timeline entry commit together, or not at all. */
export const changeLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase.rpc("change_lead_status", {
      _lead_id: data.leadId,
      _next: data.status,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return updated as unknown as LeadRow;
  });

/** Timeline for a single lead. */
export const getLeadActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ leadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_activities")
      .select("id, type, title, body, created_at")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });
