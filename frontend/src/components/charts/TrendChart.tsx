import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";

interface TrendChartProps {
  points: TrendPoint[];
  height?: number;
}

export function TrendChart({ points, height = 300 }: TrendChartProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`total-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4676a9" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#4676a9" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`severe-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCompact(Number(value))}
        />
        <Tooltip
          formatter={(value, name) => [
            name === "Severe rate"
              ? formatPercent(Number(value))
              : `${formatNumber(Number(value))} collisions`,
            String(name),
          ]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 32px -16px rgba(15,23,42,0.25)",
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="total"
          name="All collisions"
          stroke="#4676a9"
          strokeWidth={2}
          fill={`url(#total-${id})`}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="severe"
          name="Serious or fatal"
          stroke="#f59e0b"
          strokeWidth={2}
          fill={`url(#severe-${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
