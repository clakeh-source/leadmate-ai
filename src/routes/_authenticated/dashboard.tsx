import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/lib/useAnalytics";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Users,
  UserPlus,
  Target,
  Trophy,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Mail,
  
  BarChart3,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Bell,
  ChevronRight,
  Circle,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Analytics — LeadFlow AI" },
      {
        name: "description",
        content:
          "Executive analytics dashboard for LeadFlow AI: pipeline, revenue, funnel, campaigns, chatbot, and rep performance.",
      },
      { property: "og:title", content: "Analytics — LeadFlow AI" },
      {
        property: "og:description",
        content:
          "Real-time reporting for AI-assisted SDR teams: KPIs, funnel, revenue, and AI insights.",
      },
    ],
  }),
  component: DashboardPage,
});


/* ============================================================
   PAGE
   ============================================================ */

function DashboardPage() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar tab={tab} onChange={setTab} />
      <div className="flex-1 min-w-0">
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-6 py-8 space-y-8">
          <PageHeader tab={tab} />
          {tab === "overview" && <OverviewTab />}
          {tab === "leads" && <LeadsTab />}
          {tab === "funnel" && <FunnelTab />}
          {tab === "email" && <EmailTab />}
          {tab === "reps" && <RepsTab />}
          {tab === "campaigns" && <CampaignsTab />}
          {tab === "revenue" && <RevenueTab />}
          {tab === "reports" && <ReportsTab />}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT
   ============================================================ */

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "Lead generation", icon: Users },
  { id: "funnel", label: "Funnel", icon: Target },
  { id: "email", label: "Email", icon: Mail },
  
  { id: "reps", label: "Sales reps", icon: Trophy },
  { id: "campaigns", label: "Campaigns", icon: BarChart3 },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "reports", label: "Reports", icon: FileText },
] as const;

type TabId = (typeof NAV)[number]["id"];

function Sidebar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 border-r border-border bg-card lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-semibold">
            LeadFlow<span className="text-gradient-brand"> AI</span>
          </span>
        </Link>
      </div>
      <nav className="p-3 space-y-1">
        <p className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Analytics
        </p>
        {NAV.map((n) => {
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              className={
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth " +
                (active
                  ? "bg-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          );
        })}
        <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>
        {[
          { label: "Inbox", icon: MessageSquare },
          { label: "Settings", icon: Settings },
        ].map((n) => (
          <div
            key={n.label}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TopBar() {
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setName(profile?.full_name || user.email || "");
    })();
    return () => {
      active = false;
    };
  }, []);

  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "—";

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-lg">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" /> Search leads
        </Link>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2 pr-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-hero text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <span className="max-w-[160px] truncate text-sm font-medium">{name || "Your account"}</span>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ tab }: { tab: TabId }) {
  const label = NAV.find((n) => n.id === tab)?.label ?? "Overview";
  const { isLoading } = useAnalytics();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Analytics</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{label}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Circle
            className={
              "h-2 w-2 " +
              (isLoading ? "fill-amber-500 text-amber-500" : "animate-pulse fill-emerald-500 text-emerald-500")
            }
          />
          {isLoading ? "Refreshing…" : "Live data"}
        </span>
        <ExportMenu />
      </div>
    </div>
  );
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu() {
  const { CSV_ROWS } = useAnalytics();
  return (
    <button
      onClick={() =>
        downloadCsv(CSV_ROWS(), `leadflow-analytics-${new Date().toISOString().slice(0, 10)}.csv`)
      }
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </button>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-card ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  delta: number;
  icon: LucideIcon;
}) {
  const positive = delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-elegant">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        {positive ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className={positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
          {positive ? "+" : ""}
          {delta}%
        </span>
        <span className="text-muted-foreground">vs prev period</span>
      </div>
    </div>
  );
}

const chartAxis = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-card)",
        fontSize: 12,
      }}
      cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
    />
  );
}

/* ============================================================
   OVERVIEW
   ============================================================ */

function OverviewTab() {
  const { KPIS, GROWTH, SOURCES, ACTIVITY, hasData } = useAnalytics();
  if (!hasData) return <EmptyState />;
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Lead growth"
            subtitle="Leads · MQL · SQL over the last 9 months"
            right={<Legend2 items={[["Leads", "oklch(0.52 0.19 262)"], ["MQL", "oklch(0.68 0.18 275)"], ["SQL", "oklch(0.75 0.15 145)"]]} />}
          />
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={GROWTH}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                <ChartTooltip />
                <Area type="monotone" dataKey="leads" stroke="oklch(0.52 0.19 262)" strokeWidth={2} fill="url(#gLeads)" />
                <Line type="monotone" dataKey="mql" stroke="oklch(0.68 0.18 275)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sql" stroke="oklch(0.75 0.15 145)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead sources" subtitle="Where your pipeline comes from" />
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={SOURCES}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {SOURCES.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {SOURCES.slice(0, 6).map((s) => (
              <div key={s.name} className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="AI insights" subtitle="Auto-generated from your last 30 days" right={<Sparkles className="h-4 w-4 text-primary" />} />
          <div className="grid gap-3 md:grid-cols-2">
            {AI_INSIGHTS.map((i) => (
              <div
                key={i.title}
                className={
                  "rounded-xl border p-4 " +
                  (i.tone === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-primary/20 bg-primary/5")
                }
              >
                <div className="flex items-start gap-2">
                  <Sparkles
                    className={
                      "mt-0.5 h-4 w-4 flex-shrink-0 " +
                      (i.tone === "warning" ? "text-amber-500" : "text-primary")
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold">{i.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Live activity" subtitle="Real-time events" right={<Circle className="h-2 w-2 animate-pulse fill-emerald-500 text-emerald-500" />} />
          <ol className="space-y-3">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={
                    "mt-1 h-2 w-2 flex-shrink-0 rounded-full " +
                    (a.tone === "success"
                      ? "bg-emerald-500"
                      : a.tone === "destructive"
                        ? "bg-destructive"
                        : a.tone === "primary"
                          ? "bg-primary"
                          : "bg-muted-foreground/40")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.ago} ago</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <Card>
      <div className="py-16 text-center">
        <p className="text-sm font-semibold">No lead data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Analytics populate automatically as leads come in from your forms and chatbot.
        </p>
        <Link
          to="/leads"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Go to Leads <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function Legend2({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   LEAD GENERATION
   ============================================================ */

function LeadsTab() {
  const { SOURCES, SEGMENTS: INDUSTRIES, SCORE_DISTRIBUTION, hasData } = useAnalytics();
  if (!hasData) return <EmptyState />;
  return (
    <>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Leads by source" />
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={SOURCES} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={chartAxis} axisLine={false} tickLine={false} width={110} />
                <ChartTooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {SOURCES.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Leads by industry" />
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={INDUSTRIES}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="leads" fill="oklch(0.62 0.2 285)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader title="Lead score distribution" subtitle="How your leads score across the 0–100 range" />
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={SCORE_DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="bucket" tick={chartAxis} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
              <ChartTooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {SCORE_DISTRIBUTION.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i < 2
                        ? "oklch(0.7 0.02 260)"
                        : i < 4
                          ? "oklch(0.62 0.2 285)"
                          : "oklch(0.75 0.15 145)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Legend3 dot="oklch(0.7 0.02 260)" label="Cold (0-40)" />
          <Legend3 dot="oklch(0.62 0.2 285)" label="MQL (41-70)" />
          <Legend3 dot="oklch(0.75 0.15 145)" label="SQL (71-100)" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Geographic breakdown" subtitle="Where your leads and revenue come from" right={<MapPin className="h-4 w-4 text-muted-foreground" />} />
        <div className="space-y-4">
          {REGIONS.map((r) => {
            const pct = (r.leads / REGIONS[0].leads) * 100;
            return (
              <div key={r.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.leads.toLocaleString()} leads · ${Math.round(r.revenue / 1000)}K revenue
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-hero"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function Legend3({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
      {label}
    </div>
  );
}

/* ============================================================
   FUNNEL
   ============================================================ */

function FunnelTab() {
  const { FUNNEL, hasData } = useAnalytics();
  const max = FUNNEL[0]?.count ?? 1;
  if (!hasData) return <EmptyState />;
  return (
    <>
      <Card>
        <CardHeader title="Sales funnel" subtitle="Visitors → Customers · conversion between each stage" />
        <div className="space-y-3">
          {FUNNEL.map((f, i) => {
            const width = (f.count / max) * 100;
            return (
              <div key={f.stage}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{f.stage}</span>
                  <span className="text-muted-foreground">
                    {f.count.toLocaleString()}
                    {i > 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {f.pct}% conv.
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-9 overflow-hidden rounded-lg bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded-lg bg-gradient-hero px-3 text-xs font-semibold text-primary-foreground transition-smooth"
                    style={{ width: `${Math.max(width, 6)}%` }}
                  >
                    {width < 15 ? "" : `${f.count.toLocaleString()}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Overall conversion</p>
          <p className="mt-2 font-display text-3xl font-bold">0.023%</p>
          <p className="mt-1 text-xs text-muted-foreground">Visitors → Customers</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Pipeline velocity</p>
          <p className="mt-2 font-display text-3xl font-bold">18.4 days</p>
          <p className="mt-1 text-xs text-emerald-600">-2.1 days vs last period</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Biggest bottleneck</p>
          <p className="mt-2 font-display text-2xl font-bold">Lead → MQL</p>
          <p className="mt-1 text-xs text-muted-foreground">Only 9.4% convert · avg 6.2 days</p>
        </Card>
      </section>
    </>
  );
}

/* ============================================================
   EMAIL
   ============================================================ */

function EmailTab() {
  const { EMAIL_STATS, EMAIL_QUEUE, EMAIL_TRENDS, TOP_EMAILS, hasEmails } = useAnalytics();
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EMAIL_STATS.map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader title="Sending queue" subtitle="Live state of your outbound queue" />
        <div className="grid gap-3 sm:grid-cols-5">
          {EMAIL_QUEUE.map((q) => (
            <div key={q.label} className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">{q.label}</p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">{q.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {!hasEmails ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">No emails sent yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send or queue your first outreach from a lead to see delivery, open and reply rates here.
            </p>
            <Link
              to="/leads"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Go to Leads <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Engagement trends" subtitle="Open and click rate week-by-week" />
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={EMAIL_TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="w" tick={chartAxis} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxis} axisLine={false} tickLine={false} unit="%" />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="open" stroke="oklch(0.52 0.19 262)" strokeWidth={2} name="Open rate" />
                  <Line type="monotone" dataKey="click" stroke="oklch(0.68 0.18 275)" strokeWidth={2} name="Click rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Subject line performance" subtitle="Your real sends, ranked by open rate" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4">Subject</th>
                    <th className="py-3 pr-4 text-right">Sent</th>
                    <th className="py-3 pr-4 text-right">Open %</th>
                    <th className="py-3 text-right">Reply %</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_EMAILS.map((e) => (
                    <tr key={e.subject} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{e.subject}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{e.sent}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{e.open}%</td>
                      <td className="py-3 text-right font-semibold tabular-nums text-emerald-600">
                        {e.reply}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

/* ============================================================
   SALES REPS
   ============================================================ */

function RepsTab() {
  const { REPS, hasData } = useAnalytics();
  if (!hasData) return <EmptyState />;
  return (
    <Card>
      <CardHeader title="Rep leaderboard" subtitle="Ranked by closed-won revenue" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pr-4">#</th>
              <th className="py-3 pr-4">Rep</th>
              <th className="py-3 pr-4 text-right">Assigned</th>
              <th className="py-3 pr-4 text-right">Contacted</th>
              <th className="py-3 pr-4 text-right">Meetings</th>
              <th className="py-3 pr-4 text-right">Won</th>
              <th className="py-3 pr-4 text-right">Close %</th>
              <th className="py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {REPS.map((r, i) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="py-3 pr-4">
                  <div
                    className={
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                      (i === 0
                        ? "bg-gradient-hero text-primary-foreground shadow-elegant"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {i + 1}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {r.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <span className="font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.assigned}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.contacted}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.meetings}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.won}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.close}%</td>
                <td className="py-3 text-right font-semibold tabular-nums">{money(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================
   CAMPAIGNS
   ============================================================ */

function CampaignsTab() {
  const { CAMPAIGNS } = useAnalytics();
  if (!CAMPAIGNS.length)
    return (
      <Card>
        <div className="py-12 text-center">
          <p className="text-sm font-semibold">No campaigns yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a campaign and enrol leads in a sequence to track its results here.
          </p>
          <Link
            to="/campaigns"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Go to Campaigns <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    );
  return (
    <Card>
      <CardHeader title="Campaign performance" subtitle="Enrolment, sends and revenue per campaign" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pr-4">Campaign</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4 text-right">Enrolled</th>
              <th className="py-3 pr-4 text-right">Active</th>
              <th className="py-3 pr-4 text-right">Emails sent</th>
              <th className="py-3 pr-4 text-right">MQL+</th>
              <th className="py-3 pr-4 text-right">Meetings</th>
              <th className="py-3 pr-4 text-right">Won</th>
              <th className="py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {CAMPAIGNS.map((c) => (
              <tr key={c.name} className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium">{c.name}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.enrolled}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.active}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.emails}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.mql}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.meetings}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{c.won}</td>
                <td className="py-3 text-right font-semibold tabular-nums">{money(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================
   REVENUE
   ============================================================ */

function RevenueTab() {
  const { REVENUE_KPIS, REVENUE_SERIES, REPS, JOURNEY, hasData } = useAnalytics();
  if (!hasData) return <EmptyState />;
  const revByRep = REPS.filter((r) => r.revenue > 0).map((r) => ({
    name: r.name.split(" ")[0],
    revenue: r.revenue,
  }));
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REVENUE_KPIS.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader
          title="Revenue & forecast"
          subtitle="Closed-won revenue by month with a trend-based 3-month forecast"
        />
        <div className="h-80">
          <ResponsiveContainer>
            <AreaChart data={REVENUE_SERIES}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="m" tick={chartAxis} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
              <ChartTooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="oklch(0.52 0.19 262)"
                strokeWidth={2}
                fill="url(#gRev)"
                name="Actual"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="oklch(0.68 0.18 275)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
                name="Forecast"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by rep" subtitle="Closed-won value per owner" />
          {revByRep.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No closed-won revenue recorded yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={revByRep}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={chartAxis} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                  <ChartTooltip />
                  <Bar dataKey="revenue" fill="oklch(0.52 0.19 262)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Customer journey" subtitle="How many leads reach each stage" />
          <ol className="space-y-4">
            {JOURNEY.map((s, i, arr) => (
              <li key={s.step} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  {i < arr.length - 1 && <div className="mt-1 h-6 w-px bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-medium">{s.step}</p>
                  <p className="text-xs text-muted-foreground">{s.value} leads</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </>
  );
}

/* ============================================================
   EXECUTIVE (C-LEVEL)
   ============================================================ */

function ExecutiveTab() {
  const {
    EXEC_KPIS,
    PIPELINE_BY_STAGE,
    PIPELINE_HEALTH,
    SCORE_TRENDS,
    REVENUE_SERIES,
    ACTIVITY,
    INSIGHTS,
    hasData,
  } = useAnalytics();
  if (!hasData) return <EmptyState />;
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXEC_KPIS.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue trajectory" subtitle="Closed-won by month with forecast" />
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={REVENUE_SERIES}>
                <defs>
                  <linearGradient id="gExecRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="oklch(0.52 0.19 262)"
                  strokeWidth={2}
                  fill="url(#gExecRev)"
                  name="Actual"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(0.68 0.18 275)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  name="Forecast"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pipeline health" subtitle="Signals a leadership team watches" />
          <div className="space-y-3">
            {PIPELINE_HEALTH.map((h) => (
              <div
                key={h.label}
                className={
                  "rounded-xl border p-4 " +
                  (h.tone === "good"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5")
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{h.label}</p>
                  <p className="font-display text-lg font-bold tabular-nums">{h.value}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{h.hint}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline by stage" subtitle="Open value sitting in each stage" />
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={PIPELINE_BY_STAGE}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="stage" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Pipeline value">
                  {PIPELINE_BY_STAGE.map((s) => (
                    <Cell key={s.stage} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead score trend" subtitle="Average score and score mix by month" />
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={SCORE_TRENDS}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} />
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avgScore" stroke="oklch(0.52 0.19 262)" strokeWidth={2} name="Avg score" />
                <Line type="monotone" dataKey="hot" stroke="oklch(0.75 0.15 145)" strokeWidth={2} name="Hot (80+)" />
                <Line type="monotone" dataKey="cold" stroke="oklch(0.72 0.18 30)" strokeWidth={2} name="Cold (<40)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="What needs a decision"
            subtitle="Generated from your live data"
            right={<Sparkles className="h-4 w-4 text-primary" />}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {INSIGHTS.map((i) => (
              <div
                key={i.title}
                className={
                  "rounded-xl border p-4 " +
                  (i.tone === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-primary/20 bg-primary/5")
                }
              >
                <p className="text-sm font-semibold">{i.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Live activity"
            subtitle="Every lead event as it happens"
            right={<Circle className="h-2 w-2 animate-pulse fill-emerald-500 text-emerald-500" />}
          />
          <ol className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={
                    "mt-1 h-2 w-2 flex-shrink-0 rounded-full " +
                    (a.tone === "success"
                      ? "bg-emerald-500"
                      : a.tone === "primary"
                        ? "bg-primary"
                        : "bg-muted-foreground/40")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.ago} ago</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </>
  );
}

/* ============================================================
   REPORTS
   ============================================================ */

const STATUS_OPTIONS = ["all", "new", "contacted", "qualified", "mql", "sql", "meeting", "won", "lost"];

function ReportsTab() {
  const { leads, CSV_ROWS, SOURCES, REPS, hasData } = useAnalytics();
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");

  const filtered = leads.filter((l) => {
    const withinRange =
      days === "all" || Date.now() - new Date(l.created_at).getTime() <= Number(days) * 86_400_000;
    return (
      withinRange && (status === "all" || l.status === status) && (source === "all" || l.source === source)
    );
  });

  const revenue = filtered
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + Number(l.estimated_value), 0);
  const pipeline = filtered
    .filter((l) => !["won", "lost"].includes(l.status))
    .reduce((s, l) => s + Number(l.estimated_value), 0);
  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s, l) => s + l.score, 0) / filtered.length)
    : 0;

  const downloadLeads = () => {
    const header = ["created_at", "status", "source", "score", "estimated_value", "country"];
    const csv = [
      header,
      ...filtered.map((l) => [
        l.created_at,
        l.status,
        l.source,
        String(l.score),
        String(l.estimated_value),
        l.country ?? "",
      ]),
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadCsv(csv, `leadflow-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!hasData) return <EmptyState />;

  return (
    <>
      <Card>
        <CardHeader
          title="Report builder"
          subtitle="Filter your real lead data and export it as a spreadsheet"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Date range"
            value={days}
            onChange={setDays}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
              { value: "all", label: "All time" },
            ]}
          />
          <SelectField
            label="Lead status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: s === "all" ? "All statuses" : s.toUpperCase(),
            }))}
          />
          <SelectField
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: "all", label: "All sources" },
              ...SOURCES.map((s) => ({ value: s.key, label: s.name })),
            ]}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Leads in report", value: filtered.length.toLocaleString() },
            { label: "Revenue", value: money(revenue) },
            { label: "Open pipeline", value: money(pipeline) },
            { label: "Avg score", value: String(avgScore) },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-display text-xl font-bold">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={downloadLeads}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Download lead report (CSV)
          </button>
          <button
            onClick={() =>
              downloadCsv(CSV_ROWS(), `leadflow-kpis-${new Date().toISOString().slice(0, 10)}.csv`)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <FileSpreadsheet className="h-4 w-4" /> Download KPI summary
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Team snapshot" subtitle="Included in every export" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4">Rep</th>
                <th className="py-3 pr-4 text-right">Assigned</th>
                <th className="py-3 pr-4 text-right">Won</th>
                <th className="py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {REPS.map((r) => (
                <tr key={r.name} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{r.name}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{r.assigned}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{r.won}</td>
                  <td className="py-3 text-right tabular-nums">{money(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none ring-ring transition-smooth focus:ring-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
