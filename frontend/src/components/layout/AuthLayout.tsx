import type { ReactNode } from "react";
import { BarChart3, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { DATASET_LABEL, DATASET_ROWS } from "@/lib/constants";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,127,17,0.22),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(70,118,169,0.22),transparent_45%)]" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-64 w-64 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -right-10 top-1/3 h-44 w-44 rounded-full border border-white/5" />

        <div className="relative">
          <Logo theme="dark" />
          <div className="mt-16 max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-400">
              Road safety intelligence
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
              See the road
              <br />
              before the crash.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Turn {DATASET_ROWS.toLocaleString("en-GB")} real UK collisions
              into severity predictions, hotspot intelligence and evidence-led
              interventions.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                label: "Severity model",
                value: "3 classes",
              },
              { icon: BarChart3, label: "Hotspots", value: "79 clusters" },
              { icon: Database, label: "Dataset", value: "105,982 rows" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <item.icon className="h-4 w-4 text-signal-400" />
                <p className="mt-3 text-xs font-medium text-slate-400">
                  {item.label}
                </p>
                <p className="mt-0.5 font-display text-lg font-bold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm leading-relaxed text-slate-300">
            “A transparent, explainable starting point for prioritising road
            safety work — not a black box.”
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {DATASET_LABEL} · OGL v3.0
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Logo />
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {subtitle}
              </p>
            </div>
            <div className="mt-7">{children}</div>
            {footer ? (
              <div className="mt-6 text-center text-sm text-slate-500">
                {footer}
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 pb-6 text-center text-[11px] text-slate-400 lg:hidden">
          UK DfT 2022 collision data · OGL v3.0
        </div>
      </main>
    </div>
  );
}
