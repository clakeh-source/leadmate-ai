import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importSchema, workspaceScopeSchema } from "@/lib/campaigns.schemas";
import { enrichLead, normalizeEmail, normalizePhone } from "@/lib/enrichment";

/**
 * Bulk lead ingestion: validates, enriches and deduplicates rows against
 * existing workspace leads (by normalized email) before inserting.
 */
export const importLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const errors: { row: number; reason: string }[] = [];
    const seen = new Set<string>();

    interface Prepared {
      email: string;
      payload: Record<string, unknown>;
    }
    const prepared: Prepared[] = [];

    data.rows.forEach((row, index) => {
      const email = row.email ? normalizeEmail(row.email) : "";
      if (!email || !emailRe.test(email)) {
        errors.push({ row: index + 1, reason: "Missing or invalid email" });
        return;
      }
      if (!row.firstName) {
        errors.push({ row: index + 1, reason: "Missing first name" });
        return;
      }
      if (seen.has(email)) {
        errors.push({ row: index + 1, reason: "Duplicate within file" });
        return;
      }
      seen.add(email);

      const enriched = enrichLead({
        email,
        company: row.company ?? null,
        companySize: row.companySize ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
      });

      prepared.push({
        email,
        payload: {
          workspace_id: data.workspaceId,
          first_name: row.firstName,
          last_name: row.lastName ?? null,
          email,
          phone: row.phone ?? null,
          normalized_phone: normalizePhone(row.phone),
          company: row.company ?? null,
          company_size: enriched.companySize,
          company_domain: enriched.companyDomain,
          industry: enriched.industry,
          enrichment: enriched.enrichment,
          enriched_at: new Date().toISOString(),
          job_title: row.jobTitle ?? null,
          country: row.country ?? null,
          linkedin_url: row.linkedinUrl ?? null,
          notes: row.notes ?? null,
          source: data.source,
          marketing_consent: false,
        },
      });
    });

    let duplicates = 0;
    let insertedCount = 0;

    if (prepared.length) {
      const { data: existing, error: existingError } = await supabase
        .from("leads")
        .select("normalized_email")
        .eq("workspace_id", data.workspaceId)
        .in(
          "normalized_email",
          prepared.map((p) => p.email),
        );
      if (existingError) throw existingError;

      const known = new Set((existing ?? []).map((e) => e.normalized_email ?? ""));
      const toInsert = prepared.filter((p) => !known.has(p.email));
      duplicates = prepared.length - toInsert.length;

      for (let i = 0; i < toInsert.length; i += 200) {
        const chunk = toInsert.slice(i, i + 200);
        const { data: rows, error } = await supabase
          .from("leads")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(chunk.map((c) => c.payload) as any)
          .select("id");
        if (error) throw new Error(error.message);
        insertedCount += rows?.length ?? 0;

        if (rows?.length) {
          await supabase.from("lead_activities").insert(
            rows.map((r) => ({
              workspace_id: data.workspaceId,
              lead_id: r.id,
              actor_id: userId,
              type: "imported",
              title: "Lead imported",
              metadata: { filename: data.filename ?? null, source: data.source },
            })),
          );
        }
      }
    }

    const summary = {
      total: data.rows.length,
      inserted: insertedCount,
      duplicates,
      invalid: errors.length,
      errors: errors.slice(0, 25),
    };

    await supabase.from("lead_imports").insert({
      workspace_id: data.workspaceId,
      created_by: userId,
      filename: data.filename ?? null,
      total_rows: summary.total,
      inserted_rows: summary.inserted,
      duplicate_rows: summary.duplicates,
      invalid_rows: summary.invalid,
      errors: summary.errors,
    });

    return summary;
  });

/** Recent import runs for the workspace. */
export const listImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workspaceScopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_imports")
      .select("id, filename, total_rows, inserted_rows, duplicate_rows, invalid_rows, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return rows ?? [];
  });

/** Backfills domain/industry enrichment for leads that are missing it. */
export const enrichExistingLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workspaceScopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("leads")
      .select("id, email, company, company_size, linkedin_url")
      .eq("workspace_id", data.workspaceId)
      .is("enriched_at", null)
      .limit(200);
    if (error) throw error;

    let updated = 0;
    for (const lead of rows ?? []) {
      const enriched = enrichLead({
        email: lead.email,
        company: lead.company,
        companySize: lead.company_size,
        linkedinUrl: lead.linkedin_url,
      });
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          company_domain: enriched.companyDomain,
          industry: enriched.industry,
          company_size: enriched.companySize ?? lead.company_size,
          enrichment: enriched.enrichment as unknown as never,
          enriched_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      if (!updateError) updated++;
    }

    return { scanned: rows?.length ?? 0, updated };
  });
