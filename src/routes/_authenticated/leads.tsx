import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { generateLeadEmail } from "@/lib/aiEmail.functions";
import { sendLeadEmail } from "@/lib/sendEmail.functions";
import { useServerFn } from "@tanstack/react-start";


type Lead = Tables<"leads">;

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: next as Lead["status"] })
        .eq("id", id);
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("lead_activities").insert({
        lead_id: id,
        actor_id: userData.user?.id ?? null,
        type: "status_change",
        title: `Status changed to ${next}`,
      });
    },
    onSuccess: () => {
      toast.success("Lead updated");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Could not update lead"),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      const matchesStatus = status === "all" || l.status === status;
      const haystack = `${l.first_name} ${l.last_name ?? ""} ${l.email} ${l.company ?? ""}`.toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [leads, query, status]);

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
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium">No leads yet</p>
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
                {filtered.map((lead) => (
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
                        onChange={(e) =>
                          updateStatus.mutate({ id: lead.id, next: e.target.value })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none ring-ring focus:ring-2"
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

function AiEmailComposer({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateLeadEmail);
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium">{draft.subject}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{draft.body}</p>
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

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const breakdown = (lead.score_breakdown ?? {}) as Record<string, number>;
  const { data: activities } = useQuery({
    queryKey: ["lead-activities", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

        <AiEmailComposer leadId={lead.id} />

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
