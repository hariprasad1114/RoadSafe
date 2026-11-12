import {
  Activity,
  ArrowRight,
  BarChart3,
  Bike,
  CheckCircle2,
  CloudRain,
  Database,
  FileCheck2,
  Gauge,
  Globe2,
  Layers,
  Lightbulb,
  LockKeyhole,
  MapPinned,
  Moon,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DATASET_ROWS } from "@/lib/constants";
import { cn, formatPercent } from "@/lib/utils";

const heroStats = [
  { value: DATASET_ROWS.toLocaleString("en-GB"), label: "real collisions" },
  { value: "79", label: "hotspot clusters" },
  { value: "10", label: "action playbooks" },
  { value: "3", label: "severity classes" },
];

const features = [
  {
    icon: Sparkles,
    title: "Severity prediction",
    description:
      "Estimate Minor, Serious or Fatal outcomes from location, road type, weather, lighting and vehicle context.",
    tone: "bg-signal-50 text-signal-600",
  },
  {
    icon: MapPinned,
    title: "Hotspot intelligence",
    description:
      "Compare broad K-Means regional clusters with dense DBSCAN clusters on an interactive UK map.",
    tone: "bg-sky-50 text-sky-600",
  },
  {
    icon: Gauge,
    title: "Explainable risk",
    description:
      "See class probabilities, active risk factors, nearby hotspots and the decision rule behind every result.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Analytics workspace",
    description:
      "Explore trends, severity splits and dimensional distributions with visible data provenance.",
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Lightbulb,
    title: "Intervention playbooks",
    description:
      "Ten prioritised engineering, enforcement and education recommendations grounded in the dataset.",
    tone: "bg-amber-50 text-amber-600",
  },
  {
    icon: LockKeyhole,
    title: "Controlled data operations",
    description:
      "Role-based auth, private storage and admin-only dataset validation, import and export workflows.",
    tone: "bg-rose-50 text-rose-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe the scenario",
    description:
      "Pick a location on the map and set the road, weather, lighting, vehicle and speed context.",
    icon: MapPinned,
  },
  {
    number: "02",
    title: "Score the severity",
    description:
      "The hierarchical Random Forest estimates Minor, Serious and Fatal probabilities in real time.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Act on the evidence",
    description:
      "Review risk drivers, nearby hotspots and targeted interventions, then export the evidence.",
    icon: Lightbulb,
  },
];

const modelMetrics = [
  { label: "Accuracy", value: 0.53, display: "53.0%" },
  { label: "Macro F1", value: 0.362, display: "0.362" },
  { label: "Fatal recall", value: 0.3255, display: "32.6%" },
  { label: "Serious recall", value: 0.4599, display: "46.0%" },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-signal-500/20 via-sky-400/10 to-transparent blur-2xl" />
      <div className="relative animate-float rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-3 shadow-lift backdrop-blur">
        <div className="rounded-[1.2rem] border border-white/10 bg-ink-950/80 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500/15">
                <ShieldCheck className="h-4 w-4 text-signal-400" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Live prediction
                </p>
                <p className="text-xs font-semibold text-white">
                  Wet night · urban junction
                </p>
              </div>
            </div>
            <Badge tone="amber" variant="soft" className="bg-amber-400/10 text-amber-300">
              High risk
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-5">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="150 302"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-white">47.3</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  risk score
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Predicted severity
              </p>
              <p className="mt-1 font-display text-xl font-bold text-amber-300">
                Serious
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Serious probability 41.2% · Fatal 6.1%
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              { label: "Minor", value: 52.7, color: "bg-emerald-400" },
              { label: "Serious", value: 41.2, color: "bg-amber-400" },
              { label: "Fatal", value: 6.1, color: "bg-rose-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              { icon: Moon, label: "Night-time" },
              { icon: CloudRain, label: "Wet road" },
              { icon: Bike, label: "Two-wheeler" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium text-slate-300"
              >
                <item.icon className="h-2.5 w-2.5" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Nearby hotspot
            </p>
            <span className="text-[10px] text-slate-500">2.4 km away</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Manchester area</p>
              <p className="text-[10px] text-slate-400">11,842 collisions · 31.8% severe</p>
            </div>
            <span className="rounded-lg bg-rose-400/10 px-2 py-1 text-[10px] font-bold text-rose-300">
              Risk 31.8
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white/10 bg-ink-950/90 p-3 shadow-lift backdrop-blur sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-white">Model v1.2.0</p>
            <p className="text-[9px] text-slate-500">44 MB · hierarchical RF</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  useDocumentTitle("Road safety intelligence");

  return (
    <div className="min-h-screen bg-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo theme="dark" />
          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how" },
              { label: "Model", href: "#model" },
              { label: "Data", href: "#data" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-xs font-semibold text-slate-400 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/app"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-signal-500 px-3.5 text-xs font-semibold text-white shadow-glow transition hover:bg-signal-600"
            >
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-950 pb-20 pt-32 sm:pb-24 sm:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,127,17,0.2),transparent_38%),radial-gradient(circle_at_88%_30%,rgba(70,118,169,0.2),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Built on 105,982 real UK collisions
              </span>
            </div>
            <h1 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              See the road{" "}
              <span className="bg-gradient-to-r from-signal-300 via-signal-400 to-amber-300 bg-clip-text text-transparent">
                before the crash.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              RoadSafe AI turns open UK collision data into severity predictions,
              hotspot intelligence and prioritised interventions for road safety
              teams.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/app"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-signal-500 px-5 text-sm font-semibold text-white shadow-glow transition hover:bg-signal-600"
              >
                Open live dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/app/predict"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                <Sparkles className="h-4 w-4 text-signal-400" />
                Try a prediction
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5" />
                No personal data
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" />
                OGL v3.0 licensed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5" />
                InsForge + Postgres
              </span>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-card sm:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="bg-white px-5 py-5 text-center sm:text-left">
              <p className="font-display text-2xl font-bold text-slate-950">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-600">
            One workspace
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            From raw collisions to a clear next action.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Prediction, clustering, analytics and intervention planning share the
            same dataset and model so every number can be traced back to its source.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift"
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", feature.tone)}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-950">{feature.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-600">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Three steps, full transparency.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Every prediction exposes its probabilities, active risk factors and
                nearby clusters. Every analysis view shows where the data came from.
              </p>
              <Link
                to="/app/predict"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white transition hover:bg-ink-900"
              >
                Run a scenario
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-950 font-display text-sm font-bold text-signal-400">
                    {step.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <step.icon className="h-4 w-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 ? (
                    <span className="absolute -bottom-3 left-[2.1rem] h-3 w-px bg-slate-200" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="model" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-600">
              Model transparency
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              A model you can interrogate.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A hierarchical two-stage Random Forest first separates severe from
              non-severe outcomes, then distinguishes Serious from Fatal. The
              deployed rule favours fatal recall without hiding the trade-off.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Layers,
                  title: "Hierarchical design",
                  text: "Stage 1: severe vs non-severe. Stage 2: Serious vs Fatal.",
                },
                {
                  icon: Activity,
                  title: "Tuned threshold",
                  text: "Fatal threshold 0.16 · Serious weight 2.0 for higher fatal recall.",
                },
                {
                  icon: Database,
                  title: "Full dataset",
                  text: "105,982 records with balanced class weighting.",
                },
                {
                  icon: Zap,
                  title: "Fast inference",
                  text: "44 MB artifact, served from the FastAPI backend.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <item.icon className="h-4 w-4 text-signal-600" />
                  <p className="mt-2 text-xs font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
              Predictions are decision support, not guarantees. Fatal and Serious
              classes are rare, so recall is prioritised over raw accuracy.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-ink-950 p-6 shadow-lift sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Held-out test performance
                </p>
                <p className="mt-1 font-display text-xl font-bold text-white">
                  Hierarchical RF · v1.2.0
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                Trained
              </span>
            </div>
            <div className="mt-7 space-y-5">
              {modelMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{metric.label}</span>
                    <span className="font-display font-bold text-white">{metric.display}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-signal-400 to-amber-300"
                      style={{ width: `${Math.min(100, metric.value * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
              {[
                { label: "Fatal F1", value: "0.094" },
                { label: "Serious F1", value: "0.331" },
                { label: "Minor F1", value: "0.661" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-display text-sm font-bold text-white">{item.value}</p>
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[10px] leading-relaxed text-slate-500">
              Test split: 15% of 105,982 records. Fatal support: 212 collisions.
              Metrics measured after threshold tuning on the validation split.
            </p>
          </div>
        </div>
      </section>

      <section id="data" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-600">
              Data provenance
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Real data. Clear boundaries.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              RoadSafe AI uses the UK Department for Transport 2022 collision
              dataset, published under the Open Government Licence v3.0. Records
              are aggregated and contain no personal identifiers.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "105,982 collision records",
                "UK DfT 2022",
                "OGL v3.0",
                "No personal data",
                "Public read access",
                "Admin-only writes",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Dataset snapshot</p>
                <p className="text-[11px] text-slate-500">Cleaned and validated at ingestion</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-xs">
              {[
                ["Date range", "1 Jan – 31 Dec 2022"],
                ["Severity split", "Minor 81,053 · Serious 23,327 · Fatal 1,602"],
                ["Top road type", "Urban road · 57,883"],
                ["Top weather", "Clear · 86,922"],
                ["Features", "Location, road, weather, lighting, vehicle, speed"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <dt className="shrink-0 font-medium text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,127,17,0.22),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-24">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to explore the network?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Open the live workspace to test a scenario, inspect hotspots or review
            the model's performance. No setup required for public views.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-signal-500 px-5 text-sm font-semibold text-white shadow-glow transition hover:bg-signal-600"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Create an account
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-slate-500">
            Demo analyst and admin accounts are available on the sign-in page.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-[11px] text-slate-400 sm:block">
              Road safety decision support
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
            <Link to="/app/predict" className="transition hover:text-slate-900">
              Predict
            </Link>
            <Link to="/app/hotspots" className="transition hover:text-slate-900">
              Hotspots
            </Link>
            <Link to="/app/recommendations" className="transition hover:text-slate-900">
              Recommendations
            </Link>
            <span>UK DfT 2022 · OGL v3.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
