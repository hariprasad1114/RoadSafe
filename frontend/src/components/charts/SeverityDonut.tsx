import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Severity } from "@/types";
import {
  SEVERITY_META,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

interface SeverityDonutProps {
  counts: Record<Severity, number>;
  total: number;
  height?: number;
}

export function SeverityDonut({ counts, total, height = 220 }: SeverityDonutProps) {
  const order: Severity[] = ["Minor", "Serious", "Fatal"];
  const data = order.map((severity) => ({
    name: severity,
    value: counts[severity] ?? 0,
    color: SEVERITY_META[severity].hex,
  }));

  return (
    <div>
      <div className="relative mx-auto" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${formatNumber(Number(value))} collisions`,
                String(name),
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 32px -16px rgba(15,23,42,0.25)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-slate-950">
            {formatNumber(total)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            collisions
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {order.map((severity) => (
          <div key={severity} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SEVERITY_META[severity].hex }}
            />
            <span className="flex-1 font-medium text-slate-600">{severity}</span>
            <span className="font-semibold text-slate-900">
              {formatNumber(counts[severity] ?? 0)}
            </span>
            <span className="w-12 text-right text-slate-400">
              {formatPercent(total ? (counts[severity] ?? 0) / total : 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
