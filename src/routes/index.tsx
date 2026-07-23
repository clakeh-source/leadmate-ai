import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import heroImage from "@/assets/hero.jpg";
import {
  Bot,
  Target,
  Mail,
  CalendarCheck,
  ShieldCheck,
  LineChart,
  ArrowRight,
  Check,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <LogosBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <ContactSection />
      <Footer />
    </div>
  );
}

/* ---------------- Header ---------------- */

function Header() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-elegant">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            LeadFlow<span className="text-gradient-brand"> AI</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-smooth hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
          >
            Dashboard
          </a>
          <a
            href="#demo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
          >
            Request demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 md:hidden"
          aria-label="Toggle menu"
        >
          <div className="space-y-1.5">
            <span className="block h-0.5 w-5 bg-foreground" />
            <span className="block h-0.5 w-5 bg-foreground" />
            <span className="block h-0.5 w-5 bg-foreground" />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#demo"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
            >
              Request demo
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-assisted SDR, with humans in the loop
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Turn every visitor into a{" "}
            <span className="text-gradient-brand">qualified pipeline.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            LeadFlow AI captures, scores, and nurtures leads around the clock —
            then hands the hot ones to your reps at exactly the right moment.
            GDPR-compliant. Fully auditable. Built for modern B2B teams.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
            >
              Book a demo <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-smooth hover:bg-accent"
            >
              See how it works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> GDPR compliant
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> 14-day free trial
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-hero opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <img
              src={heroImage}
              alt="LeadFlow AI pipeline visualization"
              width={1600}
              height={1200}
              className="h-auto w-full"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-card sm:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New SQL detected</p>
                <p className="text-sm font-semibold">Score 87 · Acme Corp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Logos ---------------- */

function LogosBar() {
  const logos = ["Acme Corp", "Northwind", "Globex", "Initech", "Umbrella", "Vandelay"];
  return (
    <section className="border-y border-border/60 bg-background py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by revenue teams at forward-thinking B2B companies
        </p>
        <div className="mt-6 grid grid-cols-2 items-center gap-8 sm:grid-cols-3 md:grid-cols-6">
          {logos.map((l) => (
            <div
              key={l}
              className="text-center font-display text-sm font-semibold tracking-tight text-muted-foreground/70"
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

const FEATURES = [
  {
    icon: Bot,
    title: "AI chatbot & lead capture",
    body: "Engage every visitor with a friendly assistant that qualifies, collects consent, and books meetings 24/7.",
  },
  {
    icon: Target,
    title: "Smart lead scoring",
    body: "A 0–100 score based on company signals, intent, and engagement — so reps focus on the leads that convert.",
  },
  {
    icon: Mail,
    title: "AI-personalized nurture",
    body: "Multi-step campaigns with emails that sound human, personalized to industry and pain points.",
  },
  {
    icon: CalendarCheck,
    title: "Meetings on autopilot",
    body: "Calendly integration books qualified prospects directly onto the right rep's calendar.",
  },
  {
    icon: Workflow,
    title: "Pipeline & CRM",
    body: "Drag-and-drop pipeline, activity timeline, and rep assignment — everything your team needs in one view.",
  },
  {
    icon: ShieldCheck,
    title: "GDPR & audit trail",
    body: "Consent tracking, data export, right-to-delete, and full activity logs baked in from day one.",
  },
];

function Features() {
  return (
    <section id="features" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything your SDR team needs, minus the busywork"
          subtitle="LeadFlow AI handles the repetitive parts of pipeline generation so your reps can spend more time on real conversations."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

const STEPS = [
  {
    icon: Users,
    title: "Capture",
    body: "Chatbot, forms, webinars, and demo requests feed leads into a single, structured inbox.",
  },
  {
    icon: LineChart,
    title: "Qualify",
    body: "AI scores each lead 0–100 using firmographics, intent signals, and engagement.",
  },
  {
    icon: Mail,
    title: "Nurture",
    body: "Automated multi-step sequences with personalized copy keep leads warm until they're ready.",
  },
  {
    icon: CalendarCheck,
    title: "Hand off",
    body: "Hot leads (score 80+) instantly notify a human rep and book straight into their calendar.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative bg-gradient-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="How it works"
          title="From first click to closed-won, one connected flow"
          subtitle="Automation for the boring 80%. Humans for the moments that matter."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-hero px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-elegant">
                Step {i + 1}
              </div>
              <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/mo",
    tag: "For small teams getting started",
    features: [
      "Up to 500 leads",
      "1 nurture campaign",
      "AI chatbot on 1 site",
      "Email support",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$149",
    cadence: "/mo",
    tag: "Most popular for scaling teams",
    features: [
      "Up to 10,000 leads",
      "Unlimited campaigns",
      "AI email personalization",
      "Calendly & Resend integrations",
      "Role-based access",
    ],
    cta: "Start 14-day trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    tag: "Advanced compliance & scale",
    features: [
      "Unlimited leads",
      "SSO & audit logs",
      "Dedicated CSM",
      "Custom integrations",
      "SLA & DPA",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your pipeline"
          subtitle="Start free. Upgrade when your team is ready. Cancel anytime."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                "relative flex flex-col rounded-2xl border p-8 transition-smooth " +
                (p.highlighted
                  ? "border-primary bg-card shadow-elegant"
                  : "border-border bg-card shadow-card hover:-translate-y-1 hover:shadow-elegant")
              }
            >
              {p.highlighted && (
                <div className="absolute -top-3 right-6 rounded-full bg-gradient-hero px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-elegant">
                  Popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.tag}</p>
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">
                  {p.price}
                </span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#demo"
                className={
                  "mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-smooth " +
                  (p.highlighted
                    ? "bg-primary text-primary-foreground shadow-elegant hover:opacity-90"
                    : "border border-border bg-background text-foreground hover:bg-accent")
                }
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact / Demo ---------------- */

function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-surface py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div id="demo" />
          <SectionHeading
            align="left"
            eyebrow="Get a demo"
            title="See LeadFlow AI on your own pipeline"
            subtitle="Tell us a bit about your team and we'll show you exactly how AI-assisted SDR fits into your workflow."
          />
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Live walkthrough of the chatbot, scoring, and CRM",
              "See how leads are handed off to reps",
              "Get a tailored ROI estimate for your team",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Thanks — we'll be in touch</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A member of our team will reach out within 1 business day.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" name="firstName" required />
                <Field label="Last name" name="lastName" required />
              </div>
              <Field label="Work email" name="email" type="email" required />
              <Field label="Company" name="company" required />
              <Field label="Company size" name="size" placeholder="e.g. 50-200" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  What are you hoping to solve?
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring transition-smooth focus:ring-2"
                  placeholder="Tell us about your current lead flow…"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
              >
                Request demo <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-muted-foreground">
                By submitting, you agree to our privacy policy. We'll never share
                your data.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring transition-smooth focus:ring-2"
      />
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-semibold">
            LeadFlow<span className="text-gradient-brand"> AI</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} LeadFlow AI. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Shared ---------------- */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
