import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  Bot,
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
   MOCK DATA (Phase 2 will replace with Lovable Cloud queries)
   ============================================================ */

const KPIS = [
  { label: "Total Leads", value: "12,847", delta: 8.4, icon: Users },
  { label: "New Leads Today", value: "142", delta: 12.1, icon: UserPlus },
  { label: "Leads This Month", value: "3,412", delta: 5.2, icon: TrendingUp },
  { label: "MQLs", value: "1,204", delta: 3.9, icon: Target },
  { label: "SQLs", value: "487", delta: 14.6, icon: Zap },
  { label: "Meetings Booked", value: "218", delta: 22.0, icon: CalendarCheck },
  { label: "Opportunities", value: "96", delta: 6.1, icon: BarChart3 },
  { label: "Deals Won", value: "34", delta: 18.4, icon: Trophy },
  { label: "Deals Lost", value: "12", delta: -4.2, icon: TrendingDown },
  { label: "Pipeline Value", value: "$1.42M", delta: 11.3, icon: DollarSign },
  { label: "Revenue Generated", value: "$482K", delta: 9.8, icon: DollarSign },
  { label: "Avg Lead Score", value: "62", delta: 2.1, icon: Activity },
  { label: "Conversion Rate", value: "3.4%", delta: 0.6, icon: TrendingUp },
  { label: "CAC", value: "$284", delta: -6.5, icon: DollarSign },
  { label: "ROI", value: "412%", delta: 24.0, icon: TrendingUp },
];

const GROWTH = [
  { m: "Jan", leads: 1420, mql: 380, sql: 120 },
  { m: "Feb", leads: 1680, mql: 460, sql: 158 },
  { m: "Mar", leads: 1890, mql: 512, sql: 182 },
  { m: "Apr", leads: 2140, mql: 590, sql: 210 },
  { m: "May", leads: 2380, mql: 665, sql: 244 },
  { m: "Jun", leads: 2610, mql: 720, sql: 268 },
  { m: "Jul", leads: 2880, mql: 812, sql: 302 },
  { m: "Aug", leads: 3140, mql: 902, sql: 348 },
  { m: "Sep", leads: 3412, mql: 1204, sql: 487 },
];

const SOURCES = [
  { name: "Organic Search", value: 3210, color: "oklch(0.52 0.19 262)" },
  { name: "Google Ads", value: 2140, color: "oklch(0.62 0.2 285)" },
  { name: "LinkedIn", value: 1980, color: "oklch(0.68 0.18 275)" },
  { name: "Chatbot", value: 1620, color: "oklch(0.72 0.14 200)" },
  { name: "Referrals", value: 1140, color: "oklch(0.75 0.15 145)" },
  { name: "Email Campaigns", value: 980, color: "oklch(0.78 0.14 90)" },
  { name: "Webinars", value: 740, color: "oklch(0.72 0.18 30)" },
  { name: "Facebook", value: 520, color: "oklch(0.65 0.2 350)" },
  { name: "Direct", value: 517, color: "oklch(0.55 0.03 260)" },
];

const INDUSTRIES = [
  { name: "SaaS", leads: 3120 },
  { name: "Fintech", leads: 2210 },
  { name: "E-commerce", leads: 1870 },
  { name: "Healthcare", leads: 1540 },
  { name: "Manufacturing", leads: 1180 },
  { name: "Education", leads: 890 },
  { name: "Retail", leads: 720 },
];

const FUNNEL = [
  { stage: "Visitors", count: 148_320, pct: 100 },
  { stage: "Leads", count: 12_847, pct: 8.7 },
  { stage: "MQL", count: 1_204, pct: 9.4 },
  { stage: "SQL", count: 487, pct: 40.4 },
  { stage: "Meetings", count: 218, pct: 44.8 },
  { stage: "Opportunities", count: 96, pct: 44.0 },
  { stage: "Customers", count: 34, pct: 35.4 },
];

const EMAIL_STATS = {
  sent: 84_210,
  delivered: 82_910,
  bounced: 1_300,
  opened: 39_784,
  clicked: 11_620,
  replied: 2_140,
  unsubscribed: 320,
  spam: 42,
};

const EMAIL_TRENDS = [
  { w: "W1", open: 41, click: 12 },
  { w: "W2", open: 44, click: 13 },
  { w: "W3", open: 47, click: 14 },
  { w: "W4", open: 48, click: 15 },
  { w: "W5", open: 46, click: 14 },
  { w: "W6", open: 49, click: 16 },
  { w: "W7", open: 51, click: 17 },
  { w: "W8", open: 48, click: 15 },
];

const TOP_EMAILS = [
  { subject: "Quick question about {{company}}'s pipeline", open: 62, click: 22, conv: 8.4 },
  { subject: "3 SDRs at your stage tried this — worth 5 minutes?", open: 58, click: 19, conv: 7.1 },
  { subject: "Saw your team is hiring — thought this might help", open: 54, click: 17, conv: 6.2 },
  { subject: "Following up on the demo request", open: 51, click: 16, conv: 5.8 },
  { subject: "Your Q4 pipeline forecast (custom for {{company}})", open: 49, click: 14, conv: 5.1 },
];

const REPS = [
  { name: "Sarah Chen", assigned: 128, contacted: 118, meetings: 42, won: 11, revenue: 184_000, close: 26.2, respMin: 8 },
  { name: "Marcus Reyes", assigned: 114, contacted: 106, meetings: 38, won: 9, revenue: 152_000, close: 23.7, respMin: 11 },
  { name: "Priya Patel", assigned: 132, contacted: 122, meetings: 44, won: 8, revenue: 128_000, close: 18.2, respMin: 6 },
  { name: "James Okoro", assigned: 98, contacted: 88, meetings: 28, won: 4, revenue: 84_000, close: 14.3, respMin: 14 },
  { name: "Elena Petrova", assigned: 106, contacted: 92, meetings: 32, won: 2, revenue: 42_000, close: 6.3, respMin: 22 },
];

const CAMPAIGNS = [
  { name: "LinkedIn ABM — Q3", leads: 1240, cost: 18_400, cpl: 14.8, mql: 41, sql: 18, meetings: 68, revenue: 142_000 },
  { name: "Google Ads — Brand", leads: 2140, cost: 22_600, cpl: 10.6, mql: 32, sql: 12, meetings: 84, revenue: 118_000 },
  { name: "Webinar — SDR Playbook", leads: 890, cost: 6_200, cpl: 7.0, mql: 48, sql: 22, meetings: 52, revenue: 96_000 },
  { name: "Retargeting — Pricing Page", leads: 610, cost: 4_800, cpl: 7.9, mql: 38, sql: 16, meetings: 28, revenue: 62_000 },
  { name: "Newsletter — Monthly", leads: 420, cost: 900, cpl: 2.1, mql: 22, sql: 6, meetings: 14, revenue: 24_000 },
];

const REVENUE_FORECAST = [
  { m: "Apr", actual: 62, forecast: null },
  { m: "May", actual: 71, forecast: null },
  { m: "Jun", actual: 78, forecast: null },
  { m: "Jul", actual: 84, forecast: null },
  { m: "Aug", actual: 92, forecast: null },
  { m: "Sep", actual: 95, forecast: 95 },
  { m: "Oct", actual: null, forecast: 108 },
  { m: "Nov", actual: null, forecast: 118 },
  { m: "Dec", actual: null, forecast: 132 },
];

const SCORE_DISTRIBUTION = [
  { bucket: "0-20", count: 2140 },
  { bucket: "21-40", count: 3820 },
  { bucket: "41-60", count: 3196 },
  { bucket: "61-80", count: 2204 },
  { bucket: "81-100", count: 1487 },
];

const REGIONS = [
  { name: "North America", leads: 5820, revenue: 248_000 },
  { name: "Europe", leads: 3910, revenue: 142_000 },
  { name: "Asia Pacific", leads: 2140, revenue: 68_000 },
  { name: "Latin America", leads: 640, revenue: 18_000 },
  { name: "Middle East & Africa", leads: 337, revenue: 6_000 },
];

const ACTIVITY = [
  { type: "won", text: "Deal won — Northwind ($42,000)", ago: "2m", tone: "success" },
  { type: "sql", text: "Lead score reached 87 — Acme Corp", ago: "5m", tone: "primary" },
  { type: "meeting", text: "Meeting booked with Globex", ago: "12m", tone: "primary" },
  { type: "email", text: "Priya's cold email opened by 14 recipients", ago: "18m", tone: "muted" },
  { type: "lead", text: "New lead from LinkedIn — Initech", ago: "24m", tone: "muted" },
  { type: "click", text: "Pricing page link clicked — Vandelay", ago: "31m", tone: "muted" },
  { type: "opp", text: "Opportunity created — $28K, Umbrella Co.", ago: "42m", tone: "primary" },
  { type: "lost", text: "Deal lost — Wonka Industries (budget)", ago: "1h", tone: "destructive" },
];

const AI_INSIGHTS = [
  {
    title: "Reallocate budget toward LinkedIn",
    body: "LinkedIn leads converted 42% better than Google Ads this month. Shifting 15% of paid spend could add ~$38K to Q4 pipeline.",
    tone: "positive",
  },
  {
    title: "Follow-up sequence #3 is underperforming",
    body: "Open rate on the day-7 email dropped from 44% to 28% over the last 3 weeks. Consider rewriting the subject line.",
    tone: "warning",
  },
  {
    title: "SaaS leads convert 2.1× faster",
    body: "Time-to-SQL for SaaS prospects is 6.4 days vs 13.7 days across other industries. Prioritize SaaS follow-ups on Sarah's queue.",
    tone: "positive",
  },
  {
    title: "Response time is hurting close rate",
    body: "Reps averaging over 15min first-response have a 41% lower close rate. Elena's queue is at 22min — consider rebalancing.",
    tone: "warning",
  },
];

/* ============================================================
   PAGE
   ============================================================ */

function DashboardPage() {
  const [tab, setTab] = useState<
    "overview" | "leads" | "funnel" | "email" | "chatbot" | "reps" | "campaigns" | "revenue" | "reports"
  >("overview");

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
          {tab === "chatbot" && <ChatbotTab />}
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
  { id: "chatbot", label: "Chatbot", icon: Bot },
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
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-lg">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search leads, deals, reports…"
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none ring-ring transition-smooth focus:ring-2"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground transition-smooth hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2 pr-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-hero text-xs font-semibold text-primary-foreground">
            SC
          </div>
          <span className="text-sm font-medium">Sarah C.</span>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ tab }: { tab: TabId }) {
  const label = NAV.find((n) => n.id === tab)?.label ?? "Overview";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Analytics</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{label}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker />
        <FilterButton label="All sources" />
        <FilterButton label="All campaigns" />
        <ExportMenu />
      </div>
    </div>
  );
}

function DateRangePicker() {
  const [value, setValue] = useState("30d");
  const opts = [
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "90d", label: "Last 90 days" },
    { id: "ytd", label: "Year to date" },
  ];
  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-card">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setValue(o.id)}
          className={
            "px-3 py-1.5 text-xs font-medium transition-smooth " +
            (value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground">
      <Filter className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-elegant"
          onMouseLeave={() => setOpen(false)}
        >
          {[
            { label: "Export as PDF", icon: FileText },
            { label: "Export as Excel", icon: FileSpreadsheet },
            { label: "Export as CSV", icon: FileSpreadsheet },
            { label: "Schedule weekly report", icon: Clock },
          ].map((i) => (
            <button
              key={i.label}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <i.icon className="h-4 w-4 text-muted-foreground" /> {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
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

function KpiCard({ label, value, delta, icon: Icon }: (typeof KPIS)[number]) {
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
  const s = EMAIL_STATS;
  const pct = (n: number, base: number) => ((n / base) * 100).toFixed(1);
  const stats = [
    { label: "Emails sent", value: s.sent.toLocaleString() },
    { label: "Delivery rate", value: `${pct(s.delivered, s.sent)}%` },
    { label: "Bounce rate", value: `${pct(s.bounced, s.sent)}%` },
    { label: "Open rate", value: `${pct(s.opened, s.delivered)}%` },
    { label: "Click rate", value: `${pct(s.clicked, s.delivered)}%` },
    { label: "Reply rate", value: `${pct(s.replied, s.delivered)}%` },
    { label: "Unsubscribes", value: s.unsubscribed.toLocaleString() },
    { label: "Spam complaints", value: s.spam.toString() },
  ];
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </section>

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
        <CardHeader title="Top performing emails" subtitle="By open, click, and conversion" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4">Subject</th>
                <th className="py-3 pr-4 text-right">Open %</th>
                <th className="py-3 pr-4 text-right">Click %</th>
                <th className="py-3 text-right">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {TOP_EMAILS.map((e) => (
                <tr key={e.subject} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{e.subject}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{e.open}%</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{e.click}%</td>
                  <td className="py-3 text-right tabular-nums font-semibold text-emerald-600">
                    {e.conv}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ============================================================
   CHATBOT
   ============================================================ */

function ChatbotTab() {
  const chatFunnel = [
    { stage: "Chat sessions", count: 8_420 },
    { stage: "Conversations started", count: 5_610 },
    { stage: "Leads captured", count: 2_140 },
    { stage: "Qualified leads", count: 892 },
    { stage: "Meetings booked", count: 214 },
  ];
  const max = chatFunnel[0].count;
  const kpis = [
    { label: "Chat sessions", value: "8,420" },
    { label: "Unique visitors", value: "6,180" },
    { label: "Conversations", value: "5,610" },
    { label: "Leads captured", value: "2,140" },
    { label: "Qualified", value: "892" },
    { label: "Handoffs", value: "148" },
    { label: "Avg duration", value: "4m 12s" },
    { label: "Completion rate", value: "68%" },
  ];
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader title="Chatbot conversion funnel" subtitle="From first visit to booked meeting" />
        <div className="space-y-3">
          {chatFunnel.map((f, i) => {
            const width = (f.count / max) * 100;
            const conv = i > 0 ? ((f.count / chatFunnel[i - 1].count) * 100).toFixed(1) : null;
            return (
              <div key={f.stage}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{f.stage}</span>
                  <span className="text-muted-foreground">
                    {f.count.toLocaleString()}
                    {conv && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {conv}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-8 overflow-hidden rounded-lg bg-muted">
                  <div
                    className="h-full rounded-lg bg-gradient-hero"
                    style={{ width: `${Math.max(width, 4)}%` }}
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

/* ============================================================
   SALES REPS
   ============================================================ */

function RepsTab() {
  const sorted = useMemo(() => [...REPS].sort((a, b) => b.revenue - a.revenue), []);
  return (
    <Card>
      <CardHeader title="Rep leaderboard" subtitle="Ranked by revenue generated" />
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
              <th className="py-3 pr-4 text-right">Response</th>
              <th className="py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
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
                      {r.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.assigned}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.contacted}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.meetings}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.won}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.close}%</td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.respMin}m</td>
                <td className="py-3 text-right font-semibold tabular-nums">
                  ${(r.revenue / 1000).toFixed(0)}K
                </td>
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
  return (
    <Card>
      <CardHeader
        title="Campaign performance"
        subtitle="Compare CPL, conversion, and ROI across campaigns"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pr-4">Campaign</th>
              <th className="py-3 pr-4 text-right">Leads</th>
              <th className="py-3 pr-4 text-right">Cost</th>
              <th className="py-3 pr-4 text-right">CPL</th>
              <th className="py-3 pr-4 text-right">MQL %</th>
              <th className="py-3 pr-4 text-right">SQL %</th>
              <th className="py-3 pr-4 text-right">Meetings</th>
              <th className="py-3 pr-4 text-right">Revenue</th>
              <th className="py-3 text-right">ROI</th>
            </tr>
          </thead>
          <tbody>
            {CAMPAIGNS.map((c) => {
              const roi = ((c.revenue - c.cost) / c.cost) * 100;
              return (
                <tr key={c.name} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{c.leads.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">${c.cost.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">${c.cpl}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{c.mql}%</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{c.sql}%</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{c.meetings}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    ${(c.revenue / 1000).toFixed(0)}K
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-emerald-600">
                    {Math.round(roi)}%
                  </td>
                </tr>
              );
            })}
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
  const revByRep = REPS.map((r) => ({ name: r.name.split(" ")[0], revenue: r.revenue / 1000 }));
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "MRR", value: "$48.2K" },
          { label: "ARR", value: "$578K" },
          { label: "Revenue this quarter", value: "$284K" },
          { label: "Forecasted Q4", value: "$358K" },
        ].map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader title="Revenue & forecast" subtitle="Actual revenue with trend-based Q4 forecast (in $K)" />
        <div className="h-80">
          <ResponsiveContainer>
            <AreaChart data={REVENUE_FORECAST}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.52 0.19 262)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="m" tick={chartAxis} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxis} axisLine={false} tickLine={false} unit="K" />
              <ChartTooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="oklch(0.52 0.19 262)"
                strokeWidth={2}
                fill="url(#gRev)"
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="oklch(0.68 0.18 275)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
                name="Forecast"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by rep" />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={revByRep}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} unit="K" />
                <ChartTooltip />
                <Bar dataKey="revenue" fill="oklch(0.52 0.19 262)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Customer journey" subtitle="Average time between stages" />
          <ol className="space-y-4">
            {[
              { step: "First visit", time: "Day 0" },
              { step: "Lead capture", time: "Day 0.3" },
              { step: "Email engagement", time: "Day 1.4" },
              { step: "Chat interaction", time: "Day 3.1" },
              { step: "Meeting booked", time: "Day 6.7" },
              { step: "Opportunity created", time: "Day 9.2" },
              { step: "Deal won", time: "Day 18.4" },
            ].map((s, i, arr) => (
              <li key={s.step} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  {i < arr.length - 1 && <div className="mt-1 h-6 w-px bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-medium">{s.step}</p>
                  <p className="text-xs text-muted-foreground">{s.time}</p>
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
   REPORTS / CUSTOM BUILDER
   ============================================================ */

function ReportsTab() {
  return (
    <>
      <Card>
        <CardHeader
          title="Custom report builder"
          subtitle="Build a report by picking a date range and filters. Save it, or schedule delivery."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select label="Date range" options={["Last 7 days", "Last 30 days", "Last 90 days", "Year to date", "Custom…"]} />
          <Select label="Source" options={["All sources", "Organic", "LinkedIn", "Google Ads", "Chatbot"]} />
          <Select label="Campaign" options={["All campaigns", "LinkedIn ABM — Q3", "Google Ads — Brand", "Webinar — SDR Playbook"]} />
          <Select label="Industry" options={["All industries", "SaaS", "Fintech", "Healthcare", "E-commerce"]} />
          <Select label="Lead status" options={["All statuses", "Cold", "MQL", "SQL", "Customer"]} />
          <Select label="Assigned rep" options={["All reps", "Sarah Chen", "Marcus Reyes", "Priya Patel"]} />
          <Select label="Group by" options={["Day", "Week", "Month", "Source", "Campaign"]} />
          <Select label="Metric" options={["Leads", "Conversions", "Revenue", "Meetings"]} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90">
            Generate report
          </button>
          <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
            Save report
          </button>
          <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
            Schedule delivery
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Scheduled reports" subtitle="Automatically emailed to stakeholders" />
        <div className="space-y-2">
          {[
            { name: "Executive weekly", freq: "Every Monday · 9:00 AM", to: "leadership@leadflow.ai", next: "In 2 days" },
            { name: "Sales team daily", freq: "Weekdays · 8:00 AM", to: "sales@leadflow.ai", next: "Tomorrow" },
            { name: "Marketing monthly", freq: "1st of each month", to: "marketing@leadflow.ai", next: "In 12 days" },
            { name: "Board quarterly", freq: "Quarterly · CFO delivery", to: "board@leadflow.ai", next: "In 41 days" },
          ].map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.freq} · to {r.to}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Next: {r.next}</span>
                <button className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Executive one-click reports" subtitle="Ready-made C-level snapshots" />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Pipeline health", icon: Activity },
            { label: "Revenue forecast", icon: DollarSign },
            { label: "Team performance", icon: Trophy },
            { label: "Campaign ROI", icon: BarChart3 },
            { label: "Growth metrics", icon: TrendingUp },
            { label: "AI insights summary", icon: Sparkles },
          ].map((r) => (
            <button
              key={r.label}
              className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition-smooth hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <r.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{r.label}</span>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none ring-ring transition-smooth focus:ring-2">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
