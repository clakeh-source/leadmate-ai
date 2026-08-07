import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Zap,
  Search,
  LogOut,
  LayoutDashboard,
  Users,
  Loader2,
  ShieldCheck,
  Mail,
  Building2,
  Sparkles,
  Copy,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateLeadEmail } from "@/lib/aiEmail.functions";
import { sendLeadEmail } from "@/lib/sendEmail.functions";
import { queueLeadEmail } from "@/lib/emailQueue.functions";
import {
  listLeads,
  changeLeadStatus,
  getLeadActivities,
  type LeadRow,
} from "@/lib/leads.functions";
import { useServerFn } from "@tanstack/react-start";

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

type StatusFilter = (typeof STATUSES)[number] | "all";
type SortKey = "created_at" | "score" | "last_touch_at";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads CRM — LeadFlow AI" },
      {
        name: "description",
        content:
          "Work your inbound pipeline: AI-scored leads, consent tracking, status updates, and activity timelines in one CRM view.",
      },
      { property: "og:title", content: "Leads CRM — LeadFlow AI" },
      {
        property: "og:description",
        content: "AI-scored inbound leads with consent tracking and pipeline status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchLeads = useServerFn(listLeads);
  const setStatusFn = useServerFn(changeLeadStatus);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [sort, setSort] = useState<SortKey>("created_at");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<LeadRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const filters = {
    page,
    pageSize,
    sort,
    direction: "desc" as const,
    ...(debounced ? { search: debounced } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(minScore > 0 ? { minScore } : {}),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => fetchLeads({ data: filters }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const updateStatus = useMutation({
    mutationFn: (vars: { leadId: string; status: (typeof STATUSES)[number] }) =>
      setStatusFn({ data: vars }),
    onSuccess: (updated) => {
      toast.success("Lead updated");
      setSelected((current) => (current && current.id === updated.id ? updated : current));
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", updated.id] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not update lead"),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">LeadFlow AI</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" /> Analytics
            </Link>
            <span className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-medium">
              <Users className="h-4 w-4" /> Leads
            </span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Leads CRM</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every inbound lead, scored 0–100 by the qualification engine the moment it lands.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, company…"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring transition-smooth focus:ring-2"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          >
            <option value={0}>Any score</option>
            <option value={45}>Score 45+</option>
            <option value={70}>Score 70+ (MQL)</option>
            <option value={85}>Score 85+</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          >
            <option value="created_at">Newest first</option>
            <option value="score">Highest score</option>
            <option value="last_touch_at">Recently touched</option>
          </select>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium">No leads match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit the demo form on the landing page to see scoring in action.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Consent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="cursor-pointer border-b border-border/60 transition-smooth last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.company ?? "—"}
                      {lead.company_size ? (
                        <span className="ml-1 text-xs">({lead.company_size})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.source.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.score} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        disabled={updateStatus.isPending}
                        onChange={(e) =>
                          updateStatus.mutate({
                            leadId: lead.id,
                            status: e.target.value as (typeof STATUSES)[number],
                          })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none ring-ring focus:ring-2 disabled:opacity-60"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {lead.marketing_consent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" /> Opted in
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            {total > 0
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} leads`
              : "0 leads"}
            {isFetching && !isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 transition-smooth hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs">
              Page {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 transition-smooth hover:bg-accent disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
      </main>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-primary/10 text-primary"
      : score >= 45
        ? "bg-muted text-foreground"
        : "bg-destructive/10 text-destructive";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {score}
    </span>
  );
}

function AiEmailComposer({ leadId, email }: { leadId: string; email: string }) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateLeadEmail);
  const send = useServerFn(sendLeadEmail);
  const queueEmail = useServerFn(queueLeadEmail);
  const [tone, setTone] = useState<"friendly" | "direct" | "consultative">("consultative");
  const [goal, setGoal] = useState<"intro" | "follow_up" | "book_meeting" | "re_engage">(
    "book_meeting",
  );
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => generate({ data: { leadId, tone, goal } }),
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not generate the email"),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      send({ data: { leadId, subject: draft!.subject.trim(), body: draft!.body.trim() } }),
    onSuccess: (result) => {
      toast.success(`Email sent to ${result.to}`);
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send the email"),
  });

  const queueMutation = useMutation({
    mutationFn: () =>
      queueEmail({ data: { leadId, subject: draft!.subject.trim(), body: draft!.body.trim() } }),
    onSuccess: () => {
      toast.success("Queued — the worker will send it shortly");
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not queue the email"),
  });


  return (
    <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">AI outreach email</h3>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value as typeof goal)}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="intro">First touch</option>
          <option value="follow_up">Follow-up</option>
          <option value="book_meeting">Book a meeting</option>
          <option value="re_engage">Re-engage</option>
        </select>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as typeof tone)}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="consultative">Consultative</option>
          <option value="friendly">Friendly</option>
          <option value="direct">Direct</option>
        </select>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 disabled:opacity-60"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Writing draft…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate email
          </>
        )}
      </button>

      {draft && (
        <div className="mt-4 rounded-lg border border-border bg-card p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </label>
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm font-medium"
          />
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Body
          </label>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={10}
            className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground"
          />

          <button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !draft.subject.trim() || !draft.body.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-smooth hover:opacity-90 disabled:opacity-60"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Send to {email}
              </>
            )}
          </button>

          <button
            onClick={() => queueMutation.mutate()}
            disabled={queueMutation.isPending || !draft.subject.trim() || !draft.body.trim()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium transition-smooth hover:bg-muted disabled:opacity-60"
          >
            {queueMutation.isPending ? "Queueing…" : "Queue for later"}
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
              toast.success("Email copied to clipboard");
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Copy className="h-3.5 w-3.5" /> Copy draft
          </button>
        </div>
      )}
    </div>
  );
}

function LeadDetail({ lead, onClose }: { lead: LeadRow; onClose: () => void }) {
  const breakdown = (lead.score_breakdown ?? {}) as Record<string, number>;
  const fetchActivities = useServerFn(getLeadActivities);
  const { data: activities } = useQuery({
    queryKey: ["lead-activities", lead.id],
    queryFn: () => fetchActivities({ data: { leadId: lead.id } }),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold">
          {lead.first_name} {lead.last_name}
        </h2>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {lead.email}
          </p>
          {lead.company && (
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {lead.company}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Qualification score</span>
            <ScoreBadge score={lead.score} />
          </div>
          <div className="mt-3 space-y-2">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{key.replace("_", " ")}</span>
                  <span>{value}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-gradient-hero"
                    style={{ width: `${Math.min(100, Number(value) * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <AiEmailComposer leadId={lead.id} email={lead.email} />

        {lead.notes && (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Stated need</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{lead.notes}</p>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-medium">Activity timeline</h3>
          <ul className="mt-3 space-y-3">
            {(activities ?? []).map((a) => (
              <li key={a.id} className="border-l-2 border-border pl-3">
                <p className="text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </li>
            ))}
            {(activities ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">No activity yet.</li>
            )}
          </ul>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full rounded-lg border border-input px-4 py-2 text-sm transition-smooth hover:bg-accent"
        >
          Close
        </button>
      </aside>
    </div>
  );
}
