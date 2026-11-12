import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "slate" | "emerald" | "amber" | "rose" | "sky" | "indigo" | "signal";
type Variant = "soft" | "solid" | "outline";

const tones: Record<Tone, Record<Variant, string>> = {
  slate: {
    soft: "bg-slate-100 text-slate-700",
    solid: "bg-slate-800 text-white",
    outline: "border border-slate-200 bg-white text-slate-600",
  },
  emerald: {
    soft: "bg-emerald-50 text-emerald-700",
    solid: "bg-emerald-600 text-white",
    outline: "border border-emerald-200 bg-white text-emerald-700",
  },
  amber: {
    soft: "bg-amber-50 text-amber-700",
    solid: "bg-amber-500 text-white",
    outline: "border border-amber-200 bg-white text-amber-700",
  },
  rose: {
    soft: "bg-rose-50 text-rose-700",
    solid: "bg-rose-600 text-white",
    outline: "border border-rose-200 bg-white text-rose-700",
  },
  sky: {
    soft: "bg-sky-50 text-sky-700",
    solid: "bg-sky-600 text-white",
    outline: "border border-sky-200 bg-white text-sky-700",
  },
  indigo: {
    soft: "bg-indigo-50 text-indigo-700",
    solid: "bg-indigo-600 text-white",
    outline: "border border-indigo-200 bg-white text-indigo-700",
  },
  signal: {
    soft: "bg-signal-50 text-signal-700",
    solid: "bg-signal-500 text-white",
    outline: "border border-signal-200 bg-white text-signal-700",
  },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  dot?: boolean;
}

export function Badge({
  className,
  tone = "slate",
  variant = "soft",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
        tones[tone][variant],
        className,
      )}
      {...props}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
