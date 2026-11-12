import { cn, formatScore, riskTone } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  label?: string;
  className?: string;
}

export function RiskGauge({ score, label, className }: RiskGaugeProps) {
  const tone = riskTone(score);
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-full max-w-[220px]">
        <svg viewBox="0 0 200 112" className="w-full">
          <path
            d="M 18 100 A 82 82 0 0 1 182 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 18 100 A 82 82 0 0 1 182 100"
            fill="none"
            stroke={tone.bar.includes("rose") ? "#ef4444" : tone.bar.includes("amber") ? "#f59e0b" : tone.bar.includes("sky") ? "#0ea5e9" : "#10b981"}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${clamped} 100`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="font-display text-4xl font-bold tracking-tight text-slate-950">
            {formatScore(clamped)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            risk score
          </span>
        </div>
      </div>
      <span
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          tone.bg,
          tone.text,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.bar)} />
        {label || tone.label}
      </span>
    </div>
  );
}
