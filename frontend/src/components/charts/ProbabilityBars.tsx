import type { Severity } from "@/types";
import { SEVERITY_META, cn, formatPercent } from "@/lib/utils";

interface ProbabilityBarsProps {
  probabilities: Record<Severity, number>;
  predicted: Severity;
}

export function ProbabilityBars({ probabilities, predicted }: ProbabilityBarsProps) {
  const order: Severity[] = ["Minor", "Serious", "Fatal"];
  return (
    <div className="space-y-4">
      {order.map((severity) => {
        const value = probabilities[severity] ?? 0;
        const meta = SEVERITY_META[severity];
        const isPredicted = predicted === severity;
        return (
          <div key={severity}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                <span className="text-sm font-medium text-slate-700">
                  {severity}
                </span>
                {isPredicted ? (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    Predicted
                  </span>
                ) : null}
              </div>
              <span className="font-display text-sm font-bold text-slate-900">
                {formatPercent(value)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  isPredicted ? meta.dot : "bg-slate-300",
                )}
                style={{ width: `${Math.max(1, value * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
