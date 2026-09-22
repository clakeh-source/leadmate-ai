import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  BarChart3,
} from "lucide-react";

const PALETTE = [
  "oklch(0.52 0.19 262)",
  "oklch(0.62 0.2 285)",
  "oklch(0.68 0.18 275)",
  "oklch(0.72 0.14 200)",
  "oklch(0.75 0.15 145)",
  "oklch(0.78 0.14 90)",
  "oklch(0.72 0.18 30)",
];

const SOURCE_LABELS: Record<string, string> = {
  website_form: "Website form",
  chatbot: "Chatbot",
  webinar: "Webinar",
  referral: "Referral",
  paid_ads: "Paid ads",
  outbound: "Outbound",
  other: "Other",
};

export type LeadRow = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  score: number;
  estimated_value: number;
  country: string | null;
  company_size: string | null;
  owner_id: string | null;
  last_contacted_at: string | null;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  type: string;
  title: string;
  created_at: string;
};

type EmailRow = {
  id: string;
  lead_id: string;
  subject: string;
  status: string;
  created_at: string;
  opened_at: string | null;
  replied_at: string | null;
};

type EventRow = { event_type: string; occurred_at: string; lead_id: string | null };
type QueueRow = { status: string; campaign_id: string | null; created_at: string };
type CampaignRow = { id: string; name: string; status: string; created_at: string };
type EnrollmentRow = { campaign_id: string | null; lead_id: string; status: string };
type ProfileRow = { id: string; full_name: string | null };

function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

const pctStr = (n: number, base: number) => (base ? `${((n / base) * 100).toFixed(1)}%` : "0%");

async function fetchAnalytics() {
  const [leadsRes, actRes, emailRes, eventRes, queueRes, campaignRes, enrollRes, profileRes] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, created_at, updated_at, status, source, score, estimated_value, country, company_size, owner_id, last_contacted_at",
        )
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("lead_activities")
        .select("id, type, title, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("lead_emails")
        .select("id, lead_id, subject, status, created_at, opened_at, replied_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("email_events")
        .select("event_type, occurred_at, lead_id")
        .order("occurred_at", { ascending: false })
        .limit(5000),
      supabase
        .from("email_queue")
        .select("status, campaign_id, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("campaigns").select("id, name, status, created_at").limit(200),
      supabase.from("sequence_enrollments").select("campaign_id, lead_id, status").limit(5000),
      supabase.from("profiles").select("id, full_name").limit(200),
    ]);

  if (leadsRes.error) throw leadsRes.error;

  return {
    leads: (leadsRes.data ?? []) as LeadRow[],
    activities: (actRes.data ?? []) as ActivityRow[],
    emails: (emailRes.data ?? []) as EmailRow[],
    events: (eventRes.data ?? []) as EventRow[],
    queue: (queueRes.data ?? []) as QueueRow[],
    campaigns: (campaignRes.data ?? []) as CampaignRow[],
    enrollments: (enrollRes.data ?? []) as EnrollmentRow[],
    profiles: (profileRes.data ?? []) as ProfileRow[],
  };
}

export function useAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 30_000,
  });

  const leads = data?.leads ?? [];
  const activities = data?.activities ?? [];
  const emails = data?.emails ?? [];
  const events = data?.events ?? [];
  const queue = data?.queue ?? [];
  const campaignRows = data?.campaigns ?? [];
  const enrollments = data?.enrollments ?? [];
  const profiles = data?.profiles ?? [];

  const count = (fn: (l: LeadRow) => boolean) => leads.filter(fn).length;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const total = leads.length;
  const won = count((l) => l.status === "won");
  const lost = count((l) => l.status === "lost");
  const mql = count((l) => l.status === "mql");
  const sql = count((l) => l.status === "sql");
  const meetings = count((l) => l.status === "meeting");
  const qualified = count((l) => l.status === "qualified");
  const revenue = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + Number(l.estimated_value), 0);
  const pipeline = leads
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .reduce((s, l) => s + Number(l.estimated_value), 0);
  const avgScore = total ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total) : 0;

  const KPIS = [
    { label: "Total Leads", value: total.toLocaleString(), delta: 0, icon: Users },
    {
      label: "New Leads Today",
      value: count((l) => new Date(l.created_at).getTime() >= startOfDay).toLocaleString(),
      delta: 0,
      icon: UserPlus,
    },
    {
      label: "Leads This Month",
      value: count((l) => new Date(l.created_at).getTime() >= startOfMonth).toLocaleString(),
      delta: 0,
      icon: TrendingUp,
    },
    { label: "MQLs", value: mql.toLocaleString(), delta: 0, icon: Target },
    { label: "SQLs", value: sql.toLocaleString(), delta: 0, icon: Zap },
    { label: "Meetings Booked", value: meetings.toLocaleString(), delta: 0, icon: CalendarCheck },
    { label: "Qualified", value: qualified.toLocaleString(), delta: 0, icon: BarChart3 },
    { label: "Deals Won", value: won.toLocaleString(), delta: 0, icon: Trophy },
    { label: "Deals Lost", value: lost.toLocaleString(), delta: 0, icon: TrendingDown },
    { label: "Pipeline Value", value: money(pipeline), delta: 0, icon: DollarSign },
    { label: "Revenue Generated", value: money(revenue), delta: 0, icon: DollarSign },
    { label: "Avg Lead Score", value: String(avgScore), delta: 0, icon: Activity },
    {
      label: "Conversion Rate",
      value: pctStr(won, total),
      delta: 0,
      icon: TrendingUp,
    },
    { label: "Avg Deal Size", value: won ? money(revenue / won) : "$0", delta: 0, icon: DollarSign },
    {
      label: "MQL Rate",
      value: pctStr(mql + sql + meetings + won, total),
      delta: 0,
      icon: Target,
    },
  ];

  // Last 9 months of lead / MQL+ / SQL+ counts
  const monthKeys = Array.from({ length: 9 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (8 - idx), 1);
    return {
      label: d.toLocaleString("en", { month: "short" }),
      start: d.getTime(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
    };
  });

  const GROWTH = monthKeys.map((mk) => {
    const inMonth = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= mk.start && t < mk.end;
    });
    return {
      m: mk.label,
      leads: inMonth.length,
      mql: inMonth.filter((l) => ["mql", "sql", "meeting", "won"].includes(l.status)).length,
      sql: inMonth.filter((l) => ["sql", "meeting", "won"].includes(l.status)).length,
    };
  });

  const sourceMap = new Map<string, number>();
  for (const l of leads) sourceMap.set(l.source, (sourceMap.get(l.source) ?? 0) + 1);
  const SOURCES = [...sourceMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      key,
      name: SOURCE_LABELS[key] ?? key,
      value,
      color: PALETTE[i % PALETTE.length]!,
    }));

  const sizeMap = new Map<string, number>();
  for (const l of leads)
    sizeMap.set(l.company_size ?? "Unknown", (sizeMap.get(l.company_size ?? "Unknown") ?? 0) + 1);
  const SEGMENTS = [...sizeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, leadsCount]) => ({ name, leads: leadsCount }));

  const stage = (statuses: string[]) => leads.filter((l) => statuses.includes(l.status)).length;
  const stages = [
    { stage: "Leads", count: total },
    { stage: "Contacted", count: stage(["contacted", "qualified", "mql", "sql", "meeting", "won"]) },
    { stage: "MQL", count: stage(["mql", "sql", "meeting", "won"]) },
    { stage: "SQL", count: stage(["sql", "meeting", "won"]) },
    { stage: "Meetings", count: stage(["meeting", "won"]) },
    { stage: "Customers", count: won },
  ];
  const FUNNEL = stages.map((s, i) => ({
    ...s,
    pct: i === 0 ? 100 : stages[i - 1]!.count ? (s.count / stages[i - 1]!.count) * 100 : 0,
  }));

  const buckets = [
    { bucket: "0-20", min: 0, max: 20 },
    { bucket: "21-40", min: 21, max: 40 },
    { bucket: "41-60", min: 41, max: 60 },
    { bucket: "61-80", min: 61, max: 80 },
    { bucket: "81-100", min: 81, max: 100 },
  ];
  const SCORE_DISTRIBUTION = buckets.map((b) => ({
    bucket: b.bucket,
    count: leads.filter((l) => l.score >= b.min && l.score <= b.max).length,
  }));

  const regionMap = new Map<string, { leads: number; revenue: number }>();
  for (const l of leads) {
    const key = l.country ?? "Unknown";
    const entry = regionMap.get(key) ?? { leads: 0, revenue: 0 };
    entry.leads += 1;
    if (l.status === "won") entry.revenue += Number(l.estimated_value);
    regionMap.set(key, entry);
  }
  const REGIONS = [...regionMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  const ACTIVITY = activities.map((a) => ({
    type: a.type,
    text: a.title,
    ago: relativeTime(a.created_at),
    tone:
      a.type === "status_change"
        ? "primary"
        : a.type === "email_sent" || a.type === "email_replied"
          ? "success"
          : ("muted" as string),
  }));

  /* ---------------- Email performance (real sends + provider events) ------- */

  const eventCount = (t: string) => events.filter((e) => e.event_type === t).length;
  const sent = emails.length;
  const delivered = Math.max(eventCount("delivered"), 0) || sent;
  const openedFromEvents = eventCount("opened");
  const opened = openedFromEvents || emails.filter((e) => e.opened_at).length;
  const clicked = eventCount("clicked");
  const repliedFromEvents = eventCount("replied");
  const replied = repliedFromEvents || emails.filter((e) => e.replied_at).length;
  const bounced = eventCount("bounced");
  const complained = eventCount("complained");
  const unsubscribed = eventCount("unsubscribed");

  const EMAIL_STATS = [
    { label: "Emails sent", value: sent.toLocaleString() },
    { label: "Delivery rate", value: pctStr(delivered, sent) },
    { label: "Bounce rate", value: pctStr(bounced, sent) },
    { label: "Open rate", value: pctStr(opened, delivered) },
    { label: "Click rate", value: pctStr(clicked, delivered) },
    { label: "Reply rate", value: pctStr(replied, delivered) },
    { label: "Unsubscribes", value: unsubscribed.toLocaleString() },
    { label: "Spam complaints", value: complained.toLocaleString() },
  ];

  const EMAIL_QUEUE = [
    { label: "Queued", value: queue.filter((q) => q.status === "queued").length },
    { label: "Processing", value: queue.filter((q) => q.status === "processing").length },
    { label: "Sent", value: queue.filter((q) => q.status === "sent").length },
    { label: "Failed", value: queue.filter((q) => q.status === "failed").length },
    { label: "Suppressed", value: queue.filter((q) => q.status === "suppressed").length },
  ];

  // Weekly open / click rate for the last 8 weeks
  const EMAIL_TRENDS = Array.from({ length: 8 }, (_, i) => {
    const end = now.getTime() - (7 - i) * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const inWeek = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t < end;
    };
    const weekSent = emails.filter((e) => inWeek(e.created_at)).length;
    const weekOpened = events.filter((e) => e.event_type === "opened" && inWeek(e.occurred_at)).length;
    const weekClicked = events.filter(
      (e) => e.event_type === "clicked" && inWeek(e.occurred_at),
    ).length;
    return {
      w: new Date(start).toLocaleDateString("en", { month: "short", day: "numeric" }),
      open: weekSent ? Math.round((weekOpened / weekSent) * 100) : 0,
      click: weekSent ? Math.round((weekClicked / weekSent) * 100) : 0,
    };
  });

  // Subject-line performance from real sends
  const subjectMap = new Map<string, { sent: number; opened: number; replied: number }>();
  for (const e of emails) {
    const key = e.subject || "(no subject)";
    const row = subjectMap.get(key) ?? { sent: 0, opened: 0, replied: 0 };
    row.sent += 1;
    if (e.opened_at) row.opened += 1;
    if (e.replied_at) row.replied += 1;
    subjectMap.set(key, row);
  }
  const TOP_EMAILS = [...subjectMap.entries()]
    .map(([subject, v]) => ({
      subject,
      sent: v.sent,
      open: v.sent ? Math.round((v.opened / v.sent) * 100) : 0,
      reply: v.sent ? Math.round((v.replied / v.sent) * 100) : 0,
    }))
    .sort((a, b) => b.open - a.open || b.sent - a.sent)
    .slice(0, 10);

  /* ---------------- Rep performance (real owners) -------------------------- */

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name ?? "Teammate"]));
  const repMap = new Map<
    string,
    { assigned: number; contacted: number; meetings: number; won: number; revenue: number }
  >();
  for (const l of leads) {
    const key = l.owner_id ?? "unassigned";
    const r = repMap.get(key) ?? { assigned: 0, contacted: 0, meetings: 0, won: 0, revenue: 0 };
    r.assigned += 1;
    if (l.last_contacted_at || l.status !== "new") r.contacted += 1;
    if (["meeting", "won"].includes(l.status)) r.meetings += 1;
    if (l.status === "won") {
      r.won += 1;
      r.revenue += Number(l.estimated_value);
    }
    repMap.set(key, r);
  }
  const REPS = [...repMap.entries()]
    .map(([id, r]) => ({
      name: id === "unassigned" ? "Unassigned" : (nameById.get(id) ?? "Teammate"),
      ...r,
      close: r.assigned ? Number(((r.won / r.assigned) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.assigned - a.assigned);

  /* ---------------- Campaign performance ----------------------------------- */

  const leadById = new Map(leads.map((l) => [l.id, l]));
  const CAMPAIGNS = campaignRows
    .map((c) => {
      const rows = enrollments.filter((e) => e.campaign_id === c.id);
      const campaignLeads = rows
        .map((r) => leadById.get(r.lead_id))
        .filter((l): l is LeadRow => Boolean(l));
      const wonLeads = campaignLeads.filter((l) => l.status === "won");
      return {
        name: c.name,
        status: c.status,
        enrolled: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        emails: queue.filter((q) => q.campaign_id === c.id && q.status === "sent").length,
        mql: campaignLeads.filter((l) => ["mql", "sql", "meeting", "won"].includes(l.status)).length,
        meetings: campaignLeads.filter((l) => ["meeting", "won"].includes(l.status)).length,
        won: wonLeads.length,
        revenue: wonLeads.reduce((s, l) => s + Number(l.estimated_value), 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.enrolled - a.enrolled);

  /* ---------------- Revenue actuals + trend forecast ----------------------- */

  const actualByMonth = monthKeys.map((mk) => ({
    m: mk.label,
    actual: leads
      .filter((l) => {
        if (l.status !== "won") return false;
        const t = new Date(l.created_at).getTime();
        return t >= mk.start && t < mk.end;
      })
      .reduce((s, l) => s + Number(l.estimated_value), 0),
  }));

  const recent = actualByMonth.slice(-6).map((r) => r.actual);
  const avgRecent = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const firstHalf = recent.slice(0, 3).reduce((a, b) => a + b, 0) / Math.max(1, recent.slice(0, 3).length);
  const secondHalf = recent.slice(3).reduce((a, b) => a + b, 0) / Math.max(1, recent.slice(3).length);
  const monthlyDrift = secondHalf - firstHalf;

  const REVENUE_SERIES: { m: string; actual: number | null; forecast: number | null }[] = [
    ...actualByMonth.map((r, i) => ({
      m: r.m,
      actual: r.actual,
      forecast: i === actualByMonth.length - 1 ? r.actual : null,
    })),
    ...Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return {
        m: d.toLocaleString("en", { month: "short" }),
        actual: null,
        forecast: Math.max(0, Math.round(avgRecent + monthlyDrift * (i + 1))),
      };
    }),
  ];

  const forecastNext3 = REVENUE_SERIES.slice(-3).reduce((s, r) => s + (r.forecast ?? 0), 0);
  const thisMonthRevenue = actualByMonth[actualByMonth.length - 1]?.actual ?? 0;

  const REVENUE_KPIS = [
    { label: "Revenue this month", value: money(thisMonthRevenue) },
    { label: "Revenue (all time)", value: money(revenue) },
    { label: "Open pipeline", value: money(pipeline) },
    { label: "Forecast next 3 months", value: money(forecastNext3) },
  ];

  /* ---------------- Data-derived insights ---------------------------------- */

  const INSIGHTS: { title: string; body: string; tone: "positive" | "warning" }[] = [];
  if (total) {
    const bySource = new Map<string, { total: number; qualified: number }>();
    for (const l of leads) {
      const row = bySource.get(l.source) ?? { total: 0, qualified: 0 };
      row.total += 1;
      if (["mql", "sql", "meeting", "won"].includes(l.status)) row.qualified += 1;
      bySource.set(l.source, row);
    }
    const ranked = [...bySource.entries()]
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => b[1].qualified / b[1].total - a[1].qualified / a[1].total);
    const best = ranked[0];
    if (best) {
      INSIGHTS.push({
        title: `${SOURCE_LABELS[best[0]] ?? best[0]} is your strongest source`,
        body: `${Math.round((best[1].qualified / best[1].total) * 100)}% of its ${best[1].total} leads reach MQL or better. Prioritise more volume here.`,
        tone: "positive",
      });
    }
    const untouched = leads.filter((l) => l.status === "new" && !l.last_contacted_at).length;
    if (untouched > 0) {
      INSIGHTS.push({
        title: `${untouched} lead${untouched === 1 ? "" : "s"} haven't been contacted`,
        body: "Leads left untouched cool off fast. Enrol them in a sequence or send a first email today.",
        tone: "warning",
      });
    }
    if (sent > 0) {
      INSIGHTS.push({
        title: `Reply rate is ${pctStr(replied, sent)}`,
        body: `${replied} repl${replied === 1 ? "y" : "ies"} from ${sent} sent email${sent === 1 ? "" : "s"}. Test shorter subject lines if this stays under 5%.`,
        tone: replied / Math.max(1, sent) >= 0.05 ? "positive" : "warning",
      });
    }
    const hot = leads.filter((l) => l.score >= 80 && !["won", "lost"].includes(l.status)).length;
    if (hot > 0) {
      INSIGHTS.push({
        title: `${hot} high-scoring lead${hot === 1 ? "" : "s"} still open`,
        body: "These scored 80+ and are not closed yet — they are the fastest route to revenue this month.",
        tone: "positive",
      });
    }
  }

  /* ---------------- Executive (C-level) view -------------------------------- */

  const STAGE_LABELS: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    mql: "MQL",
    sql: "SQL",
    meeting: "Meeting",
  };
  const PIPELINE_BY_STAGE = Object.entries(STAGE_LABELS).map(([key, label], i) => {
    const rows = leads.filter((l) => l.status === key);
    return {
      stage: label,
      count: rows.length,
      value: rows.reduce((s, l) => s + Number(l.estimated_value), 0),
      color: PALETTE[i % PALETTE.length]!,
    };
  });

  const closedLeads = leads.filter((l) => l.status === "won" || l.status === "lost");
  const daysBetween = (a: string, b: string) =>
    Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  const avgCycleDays = closedLeads.length
    ? closedLeads.reduce((s, l) => s + daysBetween(l.created_at, l.updated_at), 0) /
      closedLeads.length
    : 0;
  const winRate = closedLeads.length ? won / closedLeads.length : 0;
  const openDeals = leads.filter((l) => !["won", "lost"].includes(l.status));
  const stale = openDeals.filter(
    (l) => Date.now() - new Date(l.updated_at).getTime() > 14 * 86_400_000,
  ).length;
  const untouchedLeads = leads.filter((l) => l.status === "new" && !l.last_contacted_at).length;
  const weightedPipeline = Math.round(pipeline * (winRate || 0.15));

  const EXEC_KPIS = [
    { label: "Revenue (all time)", value: money(revenue), sub: `${won} closed-won deals` },
    { label: "Open pipeline", value: money(pipeline), sub: `${openDeals.length} active deals` },
    {
      label: "Weighted pipeline",
      value: money(weightedPipeline),
      sub: `at ${(winRate * 100).toFixed(0)}% historic win rate`,
    },
    {
      label: "Avg sales cycle",
      value: avgCycleDays ? `${avgCycleDays.toFixed(1)} days` : "—",
      sub: `${closedLeads.length} closed deals measured`,
    },
    { label: "Win rate", value: pctStr(won, closedLeads.length || 0), sub: `${lost} lost` },
    { label: "Avg deal size", value: won ? money(revenue / won) : "$0", sub: "closed-won average" },
    { label: "Avg lead score", value: String(avgScore), sub: `${total} leads scored` },
    {
      label: "Needs attention",
      value: String(stale + untouchedLeads),
      sub: `${untouchedLeads} never contacted · ${stale} stale 14d+`,
    },
  ];

  const PIPELINE_HEALTH = [
    {
      label: "Coverage vs revenue",
      value: revenue ? `${(pipeline / revenue).toFixed(1)}x` : "—",
      tone: pipeline >= revenue * 3 ? "good" : "warn",
      hint: "Healthy teams keep 3x or more open pipeline against closed revenue.",
    },
    {
      label: "Untouched leads",
      value: String(untouchedLeads),
      tone: untouchedLeads === 0 ? "good" : "warn",
      hint: "New leads with no outreach logged yet.",
    },
    {
      label: "Stale deals (14d+)",
      value: String(stale),
      tone: stale === 0 ? "good" : "warn",
      hint: "Open deals with no change in the last two weeks.",
    },
    {
      label: "Hot open leads (80+)",
      value: String(openDeals.filter((l) => l.score >= 80).length),
      tone: "good",
      hint: "Highest-scoring deals still in play.",
    },
  ];

  const SCORE_TRENDS = monthKeys.map((mk) => {
    const inMonth = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= mk.start && t < mk.end;
    });
    const avg = inMonth.length
      ? Math.round(inMonth.reduce((s, l) => s + l.score, 0) / inMonth.length)
      : 0;
    return {
      m: mk.label,
      avgScore: avg,
      hot: inMonth.filter((l) => l.score >= 80).length,
      cold: inMonth.filter((l) => l.score < 40).length,
    };
  });

  const JOURNEY = [
    { step: "Lead captured", value: String(total) },
    { step: "First outreach", value: String(leads.filter((l) => l.last_contacted_at).length) },
    { step: "Engaged (open/click/reply)", value: String(opened + clicked + replied) },
    { step: "Qualified (MQL+)", value: String(mql + sql + meetings + won) },
    { step: "Meeting booked", value: String(meetings + won) },
    { step: "Closed won", value: String(won) },
  ];

  const FUNNEL_STATS = (() => {
    const drops = FUNNEL.slice(1).sort((a, b) => a.pct - b.pct);
    const worst = drops[0];
    return [
      { label: "Overall conversion", value: pctStr(won, total), hint: "Leads → customers" },
      {
        label: "Sales cycle",
        value: avgCycleDays ? `${avgCycleDays.toFixed(1)} days` : "—",
        hint: "Average create → close",
      },
      {
        label: "Biggest bottleneck",
        value: worst ? worst.stage : "—",
        hint: worst ? `Only ${worst.pct.toFixed(1)}% get through this step` : "Not enough data yet",
      },
    ];
  })();

  const CSV_ROWS = () => {
    const header = [
      "metric",
      "value",
    ];
    const rows: string[][] = [
      ...KPIS.map((k) => [k.label, String(k.value)]),
      ...EXEC_KPIS.map((k) => [k.label, String(k.value)]),
      ...EMAIL_STATS.map((s) => [s.label, String(s.value)]),
      ...REPS.map((r) => [`Rep: ${r.name} revenue`, String(r.revenue)]),
      ...CAMPAIGNS.map((c) => [`Campaign: ${c.name} revenue`, String(c.revenue)]),
    ];
    return [header, ...rows]
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
  };

  return {
    isLoading,
    error,
    hasData: total > 0,
    leads,
    KPIS,
    EXEC_KPIS,
    PIPELINE_BY_STAGE,
    PIPELINE_HEALTH,
    SCORE_TRENDS,
    JOURNEY,
    FUNNEL_STATS,
    CSV_ROWS,
    GROWTH,
    SOURCES,
    SEGMENTS,
    FUNNEL,
    SCORE_DISTRIBUTION,
    REGIONS,
    ACTIVITY,
    EMAIL_STATS,
    EMAIL_QUEUE,
    EMAIL_TRENDS,
    TOP_EMAILS,
    hasEmails: sent > 0,
    REPS,
    CAMPAIGNS,
    REVENUE_SERIES,
    REVENUE_KPIS,
    INSIGHTS,
  };
}
