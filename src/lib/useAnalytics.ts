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
};

export type ActivityRow = {
  id: string;
  type: string;
  title: string;
  created_at: string;
};

function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

async function fetchAnalytics() {
  const [leadsRes, actRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, created_at, status, source, score, estimated_value, country, company_size")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("lead_activities")
      .select("id, type, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (leadsRes.error) throw leadsRes.error;
  if (actRes.error) throw actRes.error;
  return {
    leads: (leadsRes.data ?? []) as LeadRow[],
    activities: (actRes.data ?? []) as ActivityRow[],
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
  const revenue = leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.estimated_value), 0);
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
      value: total ? `${((won / total) * 100).toFixed(1)}%` : "0%",
      delta: 0,
      icon: TrendingUp,
    },
    {
      label: "Avg Deal Size",
      value: won ? money(revenue / won) : "$0",
      delta: 0,
      icon: DollarSign,
    },
    {
      label: "MQL Rate",
      value: total ? `${(((mql + sql + meetings + won) / total) * 100).toFixed(1)}%` : "0%",
      delta: 0,
      icon: Target,
    },
  ];

  // Last 9 months of lead / MQL+ / SQL+ counts
  const GROWTH = Array.from({ length: 9 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (8 - idx), 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const inMonth = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= start && t < end;
    });
    return {
      m: d.toLocaleString("en", { month: "short" }),
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
      name: SOURCE_LABELS[key] ?? key,
      value,
      color: PALETTE[i % PALETTE.length]!,
    }));

  const sizeMap = new Map<string, number>();
  for (const l of leads) sizeMap.set(l.company_size ?? "Unknown", (sizeMap.get(l.company_size ?? "Unknown") ?? 0) + 1);
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
      a.type === "status_change" ? "primary" : a.type === "note" ? "muted" : ("muted" as string),
  }));

  return {
    isLoading,
    error,
    hasData: total > 0,
    leads,
    KPIS,
    GROWTH,
    SOURCES,
    SEGMENTS,
    FUNNEL,
    SCORE_DISTRIBUTION,
    REGIONS,
    ACTIVITY,
  };
}
