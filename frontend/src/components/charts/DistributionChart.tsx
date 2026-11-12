import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionValue } from "@/types";
import { SEVERITY_META, formatCompact, formatNumber } from "@/lib/utils";

interface DistributionChartProps {
  values: DistributionValue[];
  dimension: string;
  maxItems?: number;
}

export function DistributionChart({
  values,
  dimension,
  maxItems = 12,
}: DistributionChartProps) {
  const data = values.slice(0, maxItems).map((item) => ({
    ...item,
    name: String(item[dimension] ?? "Unknown"),
  }));
  const height = Math.max(260, data.length * 38 + 60);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCompact(Number(value))}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 10, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
        />
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
        <Legend
          verticalAlign="top"
          height={30}
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar
          dataKey="minor"
          name="Minor"
          stackId="severity"
          fill={SEVERITY_META.Minor.hex}
          isAnimationActive={false}
        />
        <Bar
          dataKey="serious"
          name="Serious"
          stackId="severity"
          fill={SEVERITY_META.Serious.hex}
          isAnimationActive={false}
        />
        <Bar
          dataKey="fatal"
          name="Fatal"
          stackId="severity"
          fill={SEVERITY_META.Fatal.hex}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
