import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Zap, LayoutDashboard, Users, Megaphone, Upload, Loader2, Play, Pause, Sparkles } from "lucide-react";
import { useWorkspace, canManage, canWrite } from "@/features/workspaces/useWorkspace";
import {
  listCampaigns,
  createCampaign,
  createSequence,
  enrollLeads,
  setSequenceActive,
} from "@/lib/campaigns.functions";
import { importLeads, listImports, enrichExistingLeads } from "@/lib/leadImport.functions";
import { parseCsv, mapCsvRows } from "@/lib/enrichment";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns & Sequences — LeadFlow AI" },
      {
        name: "description",
        content:
          "Build multi-step outreach sequences, enroll qualified leads, import CSV lists with dedupe, and enrich firmographics automatically.",
      },
      { property: "og:title", content: "Campaigns & Sequences — LeadFlow AI" },
      {
        property: "og:description",
        content: "Multi-step AI outreach sequences, CSV import with dedupe, and lead enrichment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignsPage,
});

const GOALS = ["intro", "follow_up", "book_meeting", "re_engage"] as const;
const TONES = ["friendly", "direct", "consultative"] as const;
const LEAD_STATUSES = ["new", "contacted", "qualified", "mql", "sql", "meeting"] as const;

interface DraftStep {
  waitHours: number;
  goal: (typeof GOALS)[number];
  tone: (typeof TONES)[number];
  useAi: boolean;
}

function CampaignsPage() {
  const queryClient = useQueryClient();
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const manage = canManage(workspace?.role);
  const write = canWrite(workspace?.role);

  const fetchCampaigns = useServerFn(listCampaigns);
  const fetchImports = useServerFn(listImports);
  const addCampaign = useServerFn(createCampaign);
  const addSequence = useServerFn(createSequence);
  const enroll = useServerFn(enrollLeads);
  const toggleSequence = useServerFn(setSequenceActive);
  const runImport = useServerFn(importLeads);
  const runEnrich = useServerFn(enrichExistingLeads);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => fetchCampaigns({ data: { workspaceId: workspaceId! } }),
  });
  const { data: imports } = useQuery({
    queryKey: ["lead-imports", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => fetchImports({ data: { workspaceId: workspaceId! } }),
  });

  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState<(typeof GOALS)[number]>("book_meeting");
  const [sequenceName, setSequenceName] = useState("");
  const [sequenceCampaign, setSequenceCampaign] = useState<string>("");
  const [steps, setSteps] = useState<DraftStep[]>([
    { waitHours: 0, goal: "intro", tone: "consultative", useAi: true },
    { waitHours: 72, goal: "follow_up", tone: "direct", useAi: true },
  ]);
  const [enrollTarget, setEnrollTarget] = useState<string>("");
  const [enrollStatus, setEnrollStatus] = useState<(typeof LEAD_STATUSES)[number]>("mql");
  const [enrollMinScore, setEnrollMinScore] = useState(70);
  const [importing, setImporting] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["lead-imports"] });
  };

  const campaignMutation = useMutation({
    mutationFn: () =>
      addCampaign({ data: { workspaceId: workspaceId!, name: campaignName, goal: campaignGoal } }),
    onSuccess: () => {
      toast.success("Campaign created");
      setCampaignName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sequenceMutation = useMutation({
    mutationFn: () =>
      addSequence({
        data: {
          workspaceId: workspaceId!,
          name: sequenceName,
          stopOnReply: true,
          ...(sequenceCampaign ? { campaignId: sequenceCampaign } : {}),
          steps: steps.map((s) => ({ ...s, useAi: s.useAi })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Sequence created with ${r.steps} steps`);
      setSequenceName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      enroll({
        data: {
          workspaceId: workspaceId!,
          sequenceId: enrollTarget,
          filter: { status: enrollStatus, minScore: enrollMinScore, limit: 100 },
        },
      }),
    onSuccess: (r) => {
      toast.success(`${r.enrolled} leads enrolled (${r.suppressed} suppressed, ${r.skipped} skipped)`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrichMutation = useMutation({
    mutationFn: () => runEnrich({ data: { workspaceId: workspaceId! } }),
    onSuccess: (r) => toast.success(`Enriched ${r.updated} of ${r.scanned} leads`),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { sequenceId: string; isActive: boolean }) =>
      toggleSequence({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    if (!workspaceId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = mapCsvRows(parseCsv(text)).slice(0, 1000);
      if (!rows.length) {
        toast.error("No rows found in that file");
        return;
      }
      const result = await runImport({
        data: {
          workspaceId,
          filename: file.name,
          source: "outbound" as const,
          rows: rows.map((r) => ({
            ...(r["firstName"] ? { firstName: r["firstName"] } : {}),
            ...(r["lastName"] ? { lastName: r["lastName"] } : {}),
            ...(r["email"] ? { email: r["email"] } : {}),
            ...(r["phone"] ? { phone: r["phone"] } : {}),
            ...(r["company"] ? { company: r["company"] } : {}),
            ...(r["companySize"] ? { companySize: r["companySize"] } : {}),
            ...(r["jobTitle"] ? { jobTitle: r["jobTitle"] } : {}),
            ...(r["country"] ? { country: r["country"] } : {}),
            ...(r["linkedinUrl"] ? { linkedinUrl: r["linkedinUrl"] } : {}),
            ...(r["notes"] ? { notes: r["notes"] } : {}),
          })),
        },
      });
      toast.success(
        `Imported ${result.inserted} leads — ${result.duplicates} duplicates, ${result.invalid} invalid`,
      );
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const sequences = data?.sequences ?? [];
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Zap className="size-5 text-primary" />
            LeadFlow AI
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            <Link
              to="/leads"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Users className="size-4" /> Leads
            </Link>
            <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-medium text-foreground">
              <Megaphone className="size-4" /> Campaigns
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Campaigns &amp; sequences</h1>
          <p className="text-sm text-muted-foreground">
            Multi-step AI outreach, bulk ingestion with dedupe, and automatic enrichment.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading campaigns…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Campaigns list + create */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Campaigns</h2>
              <ul className="mt-4 space-y-2">
                {campaigns.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Goal: {c.goal.replace("_", " ")}</p>
                  </li>
                ))}
                {!campaigns.length && (
                  <li className="text-sm text-muted-foreground">No campaigns yet.</li>
                )}
              </ul>

              {manage && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Campaign name"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value as (typeof GOALS)[number])}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={campaignName.trim().length < 2 || campaignMutation.isPending}
                    onClick={() => campaignMutation.mutate()}
                    className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {campaignMutation.isPending ? "Creating…" : "Create campaign"}
                  </button>
                </div>
              )}
            </section>

            {/* Sequence builder */}
            <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h2 className="font-display text-lg font-semibold">Sequences</h2>
              <ul className="mt-4 space-y-3">
                {sequences.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.steps.length} steps · {s.enrollments.active} active ·{" "}
                          {s.enrollments.completed} completed
                          {s.stop_on_reply ? " · stops on reply" : ""}
                        </p>
                      </div>
                      {manage && (
                        <button
                          onClick={() =>
                            toggleMutation.mutate({ sequenceId: s.id, isActive: !s.is_active })
                          }
                          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                        >
                          {s.is_active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                          {s.is_active ? "Pause" : "Resume"}
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.steps.map((step) => (
                        <span
                          key={step.id}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          #{step.step_order} · {step.goal.replace("_", " ")} · wait {step.wait_hours}h
                          {step.use_ai ? " · AI" : ""}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
                {!sequences.length && (
                  <li className="text-sm text-muted-foreground">No sequences yet.</li>
                )}
              </ul>

              {manage && (
                <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={sequenceName}
                      onChange={(e) => setSequenceName(e.target.value)}
                      placeholder="Sequence name"
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={sequenceCampaign}
                      onChange={(e) => setSequenceCampaign(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No campaign</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {steps.map((step, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-4">
                      <input
                        type="number"
                        min={0}
                        value={step.waitHours}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, waitHours: Number(e.target.value) } : s,
                            ),
                          )
                        }
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        aria-label={`Step ${index + 1} wait hours`}
                      />
                      <select
                        value={step.goal}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((s, i) =>
                              i === index
                                ? { ...s, goal: e.target.value as (typeof GOALS)[number] }
                                : s,
                            ),
                          )
                        }
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        aria-label={`Step ${index + 1} goal`}
                      >
                        {GOALS.map((g) => (
                          <option key={g} value={g}>
                            {g.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <select
                        value={step.tone}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((s, i) =>
                              i === index
                                ? { ...s, tone: e.target.value as (typeof TONES)[number] }
                                : s,
                            ),
                          )
                        }
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        aria-label={`Step ${index + 1} tone`}
                      >
                        {TONES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                        className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        disabled={steps.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setSteps((prev) => [
                          ...prev,
                          { waitHours: 72, goal: "follow_up", tone: "friendly", useAi: true },
                        ])
                      }
                      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                      disabled={steps.length >= 10}
                    >
                      Add step
                    </button>
                    <button
                      onClick={() => sequenceMutation.mutate()}
                      disabled={sequenceName.trim().length < 2 || sequenceMutation.isPending}
                      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {sequenceMutation.isPending ? "Creating…" : "Create sequence"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Enrollment */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Enroll leads</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Suppressed and do-not-contact leads are always skipped.
              </p>
              <div className="mt-4 space-y-2">
                <select
                  value={enrollTarget}
                  onChange={(e) => setEnrollTarget(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Sequence"
                >
                  <option value="">Select a sequence</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={enrollStatus}
                  onChange={(e) =>
                    setEnrollStatus(e.target.value as (typeof LEAD_STATUSES)[number])
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Lead status"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
                <label className="block text-xs text-muted-foreground">
                  Minimum score: {enrollMinScore}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={enrollMinScore}
                    onChange={(e) => setEnrollMinScore(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <button
                  onClick={() => enrollMutation.mutate()}
                  disabled={!enrollTarget || !write || enrollMutation.isPending}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {enrollMutation.isPending ? "Enrolling…" : "Enroll matching leads"}
                </button>
              </div>
            </section>

            {/* Import + enrichment */}
            <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h2 className="font-display text-lg font-semibold">Import &amp; enrichment</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV with columns like name, email, company, size, title, country. Duplicates are
                detected on normalized email.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="size-4" />
                  {importing ? "Importing…" : "Upload CSV"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={!write || importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => enrichMutation.mutate()}
                  disabled={!write || enrichMutation.isPending}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  <Sparkles className="size-4" />
                  {enrichMutation.isPending ? "Enriching…" : "Enrich existing leads"}
                </button>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {(imports ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
                  >
                    <span className="font-medium">{row.filename ?? "Import"}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.inserted_rows} added · {row.duplicate_rows} duplicates ·{" "}
                      {row.invalid_rows} invalid · {new Date(row.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
                {!imports?.length && (
                  <li className="text-sm text-muted-foreground">No imports yet.</li>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
