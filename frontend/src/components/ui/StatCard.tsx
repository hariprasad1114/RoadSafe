import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "ink" | "emerald" | "amber" | "rose" | "sky" | "signal";

const tones: Record<Tone, { icon: string; bar: string }> = {
  ink: { icon: "bg-ink-50 text-ink-600", bar: "bg-ink-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  amber: { icon: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  rose: { icon: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  sky: { icon: "bg-sky-50 text-sky-600", bar: "bg-sky-500" },
  signal: { icon: "bg-signal-50 text-signal-600", bar: "bg-signal-500" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "ink",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card",
        className,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", tones[tone].bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105",
              tones[tone].icon,
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
