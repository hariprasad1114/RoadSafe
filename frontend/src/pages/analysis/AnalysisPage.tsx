import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Database, Filter, Gauge, Layers, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { useApi } from "@/hooks/useApi";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Dimension, DistributionResponse, TrendsResponse } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { SeverityDonut } from "@/components/charts/SeverityDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { formatNumber, formatPercent } from "@/lib/utils";

const DIMENSION_LABELS: Record<string, string> = {
  road_type: "Road type",
  weather: "Weather",
  vehicle_type: "Vehicle type",
  time_of_day: "Time of day",
  day_of_week: "Day of week",
  lighting_condition: "Lighting",
  road_condition: "Road condition",
  speed_limit: "Speed limit",
  month: "Month",
  severity: "Severity",
};

export function AnalysisPage() {
  useDocumentTitle("Analysis");
  const [granularity, setGranularity] = useState<"month" | "week" | "day">("month");
  const [dimension, setDimension] = useState("road_type");

  const summary = useApi<any>("/api/v1/analytics/summary");
  const trends = useApi<TrendsResponse>(`/api/v1/analytics/trends?granularity=${granularity}`);
  const distributions = useApi<DistributionResponse>(
    `/api/v1/analytics/distributions?dimension=${dimension}`,
  );
  const dimensions = useApi<{ dimensions: Dimension[] }>("/api/v1/analytics/dimensions");

  const availableDimensions = dimensions.data?.dimensions || [];
  const dimensionOptions = availableDimensions.length
    ? availableDimensions
    : Object.keys(DIMENSION_LABELS).map((key) => ({ key, label: DIMENSION_LABELS[key] }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytical workspace"
        title="Collision analysis"
        description="Explore trends, severity splits and dimensional distributions with visible data provenance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total collisions"
          value={formatNumber(summary.data?.total_accidents)}
          hint="Across the dataset"
          icon={<Database className="h-5 w-5" />}
          tone="ink"
        />
        <StatCard
          label="Severe collisions"
          value={formatNumber(summary.data?.severe_count)}
          hint={formatPercent(summary.data?.severe_rate ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          label="Fatal collisions"
          value={formatNumber(summary.data?.severity_counts?.Fatal)}
          hint={formatPercent(summary.data?.fatal_rate ?? 0)}
          icon={<Gauge className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Top road type"
          value={summary.data?.top_road_type || "—"}
          hint={summary.data?.top_weather ? `Top weather: ${summary.data.top_weather}` : undefined}
          icon={<Layers className="h-5 w-5" />}
          tone="signal"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Collision trend"
            description="Volume and severe outcomes over time."
            action={
              <SegmentedControl
                value={granularity}
                onChange={setGranularity}
                options={[
                  { value: "month", label: "Monthly" },
                  { value: "week", label: "Weekly" },
                  { value: "day", label: "Daily" },
                ]}
                size="sm"
              />
            }
          />
          <CardContent>
            {trends.loading ? (
              <LoadingState label="Loading trend" />
            ) : trends.error ? (
              <ErrorState message={trends.error} onRetry={trends.refetch} />
            ) : (
              <TrendChart points={(trends.data?.points || []) as any} height={300} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Severity split"
            description="Distribution of the three severity classes."
          />
          <CardContent>
            {summary.loading ? (
              <LoadingState label="Loading summary" />
            ) : summary.error ? (
              <ErrorState message={summary.error} onRetry={summary.refetch} />
            ) : (
              <SeverityDonut
                counts={summary.data?.severity_counts || { Minor: 0, Serious: 0, Fatal: 0 }}
                total={summary.data?.total_accidents || 0}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Trend over time"
          description="All collisions versus serious-or-fatal outcomes."
        />
        <CardContent>
          {trends.loading ? (
            <LoadingState label="Loading trend" />
          ) : trends.error ? (
            <ErrorState message={trends.error} onRetry={trends.refetch} />
          ) : (
            <TrendChart points={(trends.data?.points || []) as any} height={340} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Dimensional distribution"
          description="Breakdown of collisions by the selected dimension."
          action={
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={dimension}
                onChange={(event) => setDimension(event.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
              >
                {dimensionOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <CardContent>
          {distributions.loading ? (
            <LoadingState label="Loading distribution" />
          ) : distributions.error ? (
            <ErrorState message={distributions.error} onRetry={distributions.refetch} />
          ) : (
            <DistributionChart
              values={(distributions.data?.values || []) as any}
              dimension={distributions.data?.dimension || dimension}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Data provenance"
          description="Source and freshness of the underlying dataset."
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Source", summary.data?.data_source || "—"],
              ["Rows", formatNumber(summary.data?.total_accidents)],
              ["Top road type", summary.data?.top_road_type || "—"],
              ["Top weather", summary.data?.top_weather || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            UK DfT 2022 collision data, published under the Open Government
            Licence v3.0. Records are aggregated and contain no personal identifiers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
