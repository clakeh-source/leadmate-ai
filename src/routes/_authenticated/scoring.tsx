import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, canManage } from "@/features/workspaces/useWorkspace";
import { ArrowLeft, RefreshCcw, Save, Target, Gauge, Activity, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scoring")({
  head: () => ({
    meta: [
      { title: "Lead scoring rules — LeadFlow AI" },
      {
        name: "description",
        content:
          "Tune how LeadFlow AI scores your leads: ICP fit, buying intent, engagement and data confidence weights per workspace.",
      },
      { property: "og:title", content: "Lead scoring rules — LeadFlow AI" },
      {
        property: "og:description",
        content: "Explainable lead scoring: set your ICP, intent keywords and qualification thresholds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScoringPage,
});

interface Rules {
  icp_weight: number;
  intent_weight: number;
  engagement_weight: number;
  confidence_weight: number;
  target_industries: string[];
  target_countries: string[];
  target_sizes: string[];
  target_titles: string[];
  intent_keywords: string[];
  mql_threshold: number;
  sql_threshold: number;
}

const toList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function ScoringPage() {
  const { data: ws } = useWorkspace();
  const qc = useQueryClient();
  const editable = canManage(ws?.role);

  const { data, isLoading } = useQuery({
    queryKey: ["scoring-rules", ws?.id],
    enabled: !!ws?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_rules")
        .select("*")
        .eq("workspace_id", ws!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Rules | null) ?? null;
    },
  });

  const [form, setForm] = useState<Rules | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: Rules) => {
      const { error } = await supabase
        .from("scoring_rules")
        .update(next)
        .eq("workspace_id", ws!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scoring rules saved");
      qc.invalidateQueries({ queryKey: ["scoring-rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescore = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recompute_workspace_scores", {
        _workspace_id: ws!.id,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`Re-scored ${n} leads with the new rules`);
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weightTotal = form
    ? form.icp_weight + form.intent_weight + form.engagement_weight + form.confidence_weight
    : 0;

  const set = <K extends keyof Rules>(key: K, value: Rules[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Lead scoring rules</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every lead score is the weighted blend of four signals. Adjust them to match how your team
          actually qualifies buyers — each lead then shows exactly why it scored what it did.
        </p>

        {isLoading || !form ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading your rules…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Signal weights</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Weights are relative — they currently add up to {weightTotal}.
              </p>
              <div className="mt-5 space-y-5">
                {(
                  [
                    ["icp_weight", "ICP fit", "Company size, industry, market and seniority match", Target],
                    ["intent_weight", "Buying intent", "Source quality plus buying language in their message", Gauge],
                    ["engagement_weight", "Engagement", "Opens, clicks and replies to your outreach", Activity],
                    ["confidence_weight", "Data confidence", "Business email and how complete the record is", ShieldCheck],
                  ] as const
                ).map(([key, label, hint, Icon]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-primary" /> {label}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {form[key]} ({weightTotal ? Math.round((form[key] / weightTotal) * 100) : 0}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      disabled={!editable}
                      value={form[key]}
                      onChange={(e) => set(key, Number(e.target.value))}
                      className="mt-2 w-full accent-[var(--primary)]"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Your ideal customer</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Target industries"
                  hint="Comma separated. Leave empty to score all industries neutrally."
                  value={form.target_industries.join(", ")}
                  disabled={!editable}
                  onChange={(v) => set("target_industries", toList(v))}
                />
                <TextField
                  label="Target countries"
                  hint="Comma separated. Leave empty for global."
                  value={form.target_countries.join(", ")}
                  disabled={!editable}
                  onChange={(v) => set("target_countries", toList(v))}
                />
                <TextField
                  label="Target company sizes"
                  hint="Matched against the size field, e.g. 200, 500, enterprise."
                  value={form.target_sizes.join(", ")}
                  disabled={!editable}
                  onChange={(v) => set("target_sizes", toList(v))}
                />
                <TextField
                  label="Decision-maker titles"
                  hint="Words that signal seniority, e.g. head, director, vp."
                  value={form.target_titles.join(", ")}
                  disabled={!editable}
                  onChange={(v) => set("target_titles", toList(v))}
                />
                <TextField
                  label="Buying-intent keywords"
                  hint="Words in their message that mean they are shopping."
                  value={form.intent_keywords.join(", ")}
                  disabled={!editable}
                  onChange={(v) => set("intent_keywords", toList(v))}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Qualification thresholds</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Marketing qualified at"
                  value={form.mql_threshold}
                  disabled={!editable}
                  onChange={(v) => set("mql_threshold", v)}
                />
                <NumberField
                  label="Sales qualified at"
                  value={form.sql_threshold}
                  disabled={!editable}
                  onChange={(v) => set("sql_threshold", v)}
                />
              </div>
            </section>

            {editable ? (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => save.mutate(form)}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save rules"}
                </button>
                <button
                  onClick={() => rescore.mutate()}
                  disabled={rescore.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-smooth hover:bg-accent disabled:opacity-60"
                >
                  <RefreshCcw className={"h-4 w-4 " + (rescore.isPending ? "animate-spin" : "")} />
                  {rescore.isPending ? "Re-scoring…" : "Re-score all leads"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only workspace owners, admins and managers can change scoring rules.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring transition-smooth focus:ring-2 disabled:opacity-60"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring transition-smooth focus:ring-2 disabled:opacity-60"
      />
    </label>
  );
}
