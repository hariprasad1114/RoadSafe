import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Gauge,
  Lightbulb,
  MapPinned,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { useApi } from "@/hooks/useApi";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type {
  AnalyticsSummary,
  HotspotSummary,
  KpiSummary,
  Metadata,
} from "@/types";
import { api, errorMessage } from "@/lib/api";
import { SeverityDonut } from "@/components/charts/SeverityDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { formatNumber, formatPercent } from "@/lib/utils";

export function DashboardPage() {
  useDocumentTitle("Dashboard");
  const [granularity, setGranularity] = useState<"month" | "week" | "day">("month");

  const kpis = useApi<KpiSummary>("/api/v1/analytics/kpis");
  const summary = useApi<AnalyticsSummary>("/api/v1/analytics/summary");
  const metadata = useApi<Metadata>("/api/v1/metadata");
  const hotspotSummary = useApi<HotspotSummary>(
    "/api/v1/hotspots/summary?algorithm=kmeans",
  );
  const trends = useApi<{ granularity: string; points: any[] }>(
    `/api/v1/analytics/trends?granularity=${granularity}`,
  );

  const loading =
    kpis.loading || summary.loading || metadata.loading || hotspotSummary.loading;

  if (loading) return <LoadingState label="Loading dashboard" />;

  const error = kpis.error || summary.error || metadata.error;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          kpis.refetch();
          summary.refetch();
          metadata.refetch();
          hotspotSummary.refetch();
          trends.refetch();
        }}
      />
    );
  }

  const k = kpis.data!;
  const s = summary.data!;
  const m = metadata.data!;
  const h = hotspotSummary.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Road safety dashboard"
        description="A single view of collision burden, model performance and hotspot coverage across the UK DfT 2022 dataset."
        badge={
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {m.data_status.source} · {formatNumber(m.data_status.rows)} rows
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total collisions"
          value={formatNumber(k.total_accidents)}
          hint={`${formatNumber(s.severe_count)} severe outcomes · ${formatPercent(s.severe_rate)}`}
          icon={<Activity className="h-5 w-5" />}
          tone="ink"
        />
        <StatCard
          label="Fatal collisions"
          value={formatNumber(k.fatal_count)}
          hint={`${formatPercent(k.fatal_rate)} of all collisions`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          label="Hotspot clusters"
          value={formatNumber(h?.cluster_count ?? 0)}
          hint={`${formatNumber(h?.covered_accidents ?? 0)} covered collisions`}
          icon={<MapPinned className="h-5 w-5" />}
          tone="signal"
        />
        <StatCard
          label="Recommendations"
          value={formatNumber(k.recommendation_count)}
          hint={`${m.model_name} · ${m.model_version}`}
          icon={<Lightbulb className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Collision trend"
            description="Monthly volume of all collisions versus serious-or-fatal outcomes."
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
            <SeverityDonut counts={s.severity_counts} total={s.total_accidents} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Model performance"
            description="Held-out test metrics for the deployed model."
            action={
              <Link
                to="/app/predict"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900"
              >
                Run prediction
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent>
            <div className="space-y-3">
              {[
                ["Model", m.model_name],
                ["Version", m.model_version],
                ["Accuracy", formatPercent(k.model.accuracy ?? 0)],
                ["Macro F1", (k.model.macro_f1 ?? 0).toFixed(3)],
                ["Fatal recall", formatPercent(k.model.fatal_recall ?? 0)],
                ["Serious recall", formatPercent(k.model.serious_recall ?? 0)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <span className="text-xs font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              Fatal outcomes are rare, so the model trades accuracy for fatal recall. Always treat predictions as decision support.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Top road type"
            description="The road type with the highest collision count."
          />
          <CardContent>
            <p className="font-display text-2xl font-bold text-slate-950">
              {s.top_road_type}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatNumber((s.severity_counts as Record<string, number>)[s.top_road_type || "Minor"] ?? 0)} collisions
            </p>
            <div className="mt-4 space-y-2">
              {Object.entries(s.severity_counts).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Top weather"
            description="The weather condition most often present at collision sites."
          />
          <CardContent>
            <p className="font-display text-2xl font-bold text-slate-950">
              {s.top_weather}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Average speed limit {s.average_speed_limit} mph
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Night share</span>
                <span className="font-semibold text-slate-900">
                  {formatPercent(s.night_share)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Wet share</span>
                <span className="font-semibold text-slate-900">
                  {formatPercent(s.wet_share)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Two-wheeler share</span>
                <span className="font-semibold text-slate-900">
                  {formatPercent(s.two_wheeler_share)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Date range</span>
                <span className="font-semibold text-slate-900">
                  {s.date_range.start} → {s.date_range.end}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Hotspot coverage"
            description="K-Means clusters ranked by risk score."
            action={
              <Link
                to="/app/hotspots"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900"
              >
                View map
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent>
            {hotspotSummary.loading ? (
              <LoadingState label="Loading hotspots" />
            ) : hotspotSummary.error ? (
              <ErrorState
                message={hotspotSummary.error}
                onRetry={hotspotSummary.refetch}
              />
            ) : (
              <div className="space-y-3">
                {(h?.top_clusters || []).slice(0, 5).map((cluster) => (
                  <div
                    key={cluster.cluster_id}
                    className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-50 text-xs font-bold text-signal-700">
                      {cluster.risk_score.toFixed(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {cluster.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatNumber(cluster.accident_count)} collisions ·{" "}
                        {formatPercent(cluster.severity_rate)} severe
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700">
                      {cluster.accident_count.toLocaleString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Intervention priorities"
            description="The highest-priority evidence-led recommendations."
            action={
              <Link
                to="/app/recommendations"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900"
              >
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent>
            <RecommendationPreview />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecommendationPreview() {
  const recommendations = useApi<{ recommendations: any[] }>(
    "/api/v1/recommendations?priority=critical",
  );
  if (recommendations.loading) return <LoadingState label="Loading recommendations" />;
  if (recommendations.error)
    return <ErrorState message={recommendations.error} onRetry={recommendations.refetch} />;
  const items = (recommendations.data?.recommendations || []).slice(0, 4);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.slug}
          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900">{item.title}</p>
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600">
              {item.priority}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {item.summary}
          </p>
        </div>
      ))}
    </div>
  );
}
