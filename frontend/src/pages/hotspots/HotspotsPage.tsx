import { useMemo, useState } from "react";
import { AlertTriangle, Filter, Layers, MapPinned, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Hotspot, HotspotClusterResponse, HotspotListResponse } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { HotspotMap } from "@/components/maps/HotspotMap";
import { formatNumber, formatPercent } from "@/lib/utils";

export function HotspotsPage() {
  useDocumentTitle("Hotspots");
  const [searchParams] = useSearchParams();
  const [algorithm, setAlgorithm] = useState<"kmeans" | "dbscan">("kmeans");
  const [limit, setLimit] = useState(50);
  const [minRisk, setMinRisk] = useState<number | "">("");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    searchParams.get("focus") ? `${algorithm}-${searchParams.get("focus")}` : null,
  );

  const [clusterForm, setClusterForm] = useState({
    algorithm: "kmeans" as "kmeans" | "dbscan",
    n_clusters: 12,
    eps_km: 2,
    min_samples: 20,
    severity: [] as string[],
    road_type: "",
    date_from: "",
    date_to: "",
  });
  const [clustering, setClustering] = useState(false);
  const [clusterResult, setClusterResult] = useState<HotspotClusterResponse | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("algorithm", algorithm);
    params.set("limit", String(limit));
    if (minRisk !== "") params.set("min_risk", String(minRisk));
    return `/api/v1/hotspots?${params.toString()}`;
  }, [algorithm, limit, minRisk]);

  const list = useApi<HotspotListResponse>(url);
  const summary = useApi<any>(
    `/api/v1/hotspots/summary?algorithm=${algorithm}`,
  );

  const clusters = list.data?.clusters || [];
  const summaryData = summary.data;

  function toggleSeverity(value: string) {
    setClusterForm((current) => ({
      ...current,
      severity: current.severity.includes(value)
        ? current.severity.filter((item) => item !== value)
        : [...current.severity, value],
    }));
  }

  async function runCluster() {
    setClusterError(null);
    setClustering(true);
    try {
      const payload = {
        algorithm: clusterForm.algorithm,
        n_clusters: clusterForm.n_clusters,
        eps_km: clusterForm.eps_km,
        min_samples: clusterForm.min_samples,
        severity: clusterForm.severity.length ? clusterForm.severity : null,
        road_type: clusterForm.road_type || null,
        date_from: clusterForm.date_from || null,
        date_to: clusterForm.date_to || null,
      };
      const result = await api.post<HotspotClusterResponse>(
        "/api/v1/hotspots/cluster",
        payload,
      );
      setClusterResult(result);
    } catch (caught) {
      setClusterError(errorMessage(caught));
    } finally {
      setClustering(false);
    }
  }

  const selectedCluster =
    clusters.find(
      (cluster) => `${cluster.algorithm}-${cluster.cluster_id}` === selectedKey,
    ) || null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Spatial intelligence"
        title="Collision hotspots"
        description="Compare broad regional K-Means clusters with dense DBSCAN clusters. Re-run clustering on filtered subsets to investigate specific scenarios."
        actions={
          <SegmentedControl
            value={algorithm}
            onChange={(value) => {
              setAlgorithm(value);
              setSelectedKey(null);
            }}
            options={[
              { value: "kmeans", label: "K-Means" },
              { value: "dbscan", label: "DBSCAN" },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clusters"
          value={formatNumber(summaryData?.cluster_count ?? clusters.length)}
          hint={algorithm === "kmeans" ? "Regional partitions" : "Dense local clusters"}
          icon={<Layers className="h-5 w-5" />}
          tone="signal"
        />
        <StatCard
          label="Covered collisions"
          value={formatNumber(summaryData?.covered_accidents ?? 0)}
          hint="Collisions inside clusters"
          icon={<MapPinned className="h-5 w-5" />}
          tone="ink"
        />
        <StatCard
          label="Average risk"
          value={formatNumber(summaryData?.average_risk ?? 0)}
          hint="Mean cluster risk score"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Highest risk"
          value={formatNumber(summaryData?.highest_risk ?? 0)}
          hint="Top cluster risk score"
          icon={<Filter className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader
            title={`${algorithm === "kmeans" ? "K-Means" : "DBSCAN"} clusters`}
            description="Click a marker to inspect the cluster. Marker size scales with collision volume."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  {[25, 50, 100, 200].map((value) => (
                    <option key={value} value={value}>
                      {value} markers
                    </option>
                  ))}
                </select>
                <select
                  value={minRisk === "" ? "" : minRisk}
                  onChange={(event) =>
                    setMinRisk(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">All risk</option>
                  <option value="20">Risk ≥ 20</option>
                  <option value="40">Risk ≥ 40</option>
                  <option value="60">Risk ≥ 60</option>
                </select>
              </div>
            }
          />
          <CardContent>
            {list.loading ? (
              <LoadingState label="Loading clusters" />
            ) : list.error ? (
              <ErrorState message={list.error} onRetry={list.refetch} />
            ) : (
              <HotspotMap
                clusters={clusters}
                selectedKey={selectedKey}
                onSelect={(cluster) =>
                  setSelectedKey(`${cluster.algorithm}-${cluster.cluster_id}`)
                }
                height={520}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Selected cluster"
            description="Collision composition and severity profile."
          />
          <CardContent>
            {selectedCluster ? (
              <div className="space-y-4">
                <div>
                  <p className="font-display text-lg font-bold text-slate-950">
                    {selectedCluster.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {algorithm === "kmeans" ? "K-Means" : "DBSCAN"} cluster ·{" "}
                    {selectedCluster.radius_km.toFixed(1)} km radius
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Collisions", formatNumber(selectedCluster.accident_count)],
                    ["Fatal", formatNumber(selectedCluster.fatal_count)],
                    ["Serious", formatNumber(selectedCluster.serious_count)],
                    ["Minor", formatNumber(selectedCluster.minor_count)],
                    ["Severe rate", formatPercent(selectedCluster.severity_rate)],
                    ["Risk score", selectedCluster.risk_score.toFixed(1)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Top road type</span>
                    <span className="font-semibold text-slate-900">
                      {selectedCluster.top_road_type || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Top weather</span>
                    <span className="font-semibold text-slate-900">
                      {selectedCluster.top_weather || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Coordinates</span>
                    <span className="font-mono text-[11px] text-slate-900">
                      {selectedCluster.latitude.toFixed(4)},{" "}
                      {selectedCluster.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                Click a marker on the map to inspect its collision composition,
                severity profile and risk score.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Cluster ranking"
          description="Clusters sorted by risk score and collision volume."
        />
        <CardContent>
          {list.loading ? (
            <LoadingState label="Loading clusters" />
          ) : clusters.length === 0 ? (
            <p className="text-xs text-slate-500">No clusters match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <th className="py-2 pr-3">Cluster</th>
                    <th className="py-2 pr-3">Collisions</th>
                    <th className="py-2 pr-3">Severe</th>
                    <th className="py-2 pr-3">Fatal</th>
                    <th className="py-2 pr-3">Severe rate</th>
                    <th className="py-2 pr-3">Risk</th>
                    <th className="py-2 pr-3">Radius</th>
                    <th className="py-2 pr-3">Top road</th>
                    <th className="py-2">Top weather</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.slice(0, 30).map((cluster) => {
                    const key = `${cluster.algorithm}-${cluster.cluster_id}`;
                    const active = selectedKey === key;
                    return (
                      <tr
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={cn(
                          "cursor-pointer border-b border-slate-100 transition hover:bg-slate-50",
                          active && "bg-signal-50/60",
                        )}
                      >
                        <td className="py-2 pr-3 font-semibold text-slate-900">
                          {cluster.label}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {formatNumber(cluster.accident_count)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {formatNumber(cluster.serious_count + cluster.fatal_count)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {formatNumber(cluster.fatal_count)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {formatPercent(cluster.severity_rate)}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-slate-900">
                          {cluster.risk_score.toFixed(1)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {cluster.radius_km.toFixed(1)} km
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {cluster.top_road_type || "—"}
                        </td>
                        <td className="py-2 text-slate-700">
                          {cluster.top_weather || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Dynamic clustering"
          description="Re-run K-Means or DBSCAN on a filtered subset of the dataset."
          action={
            <Button onClick={runCluster} loading={clustering} size="sm">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Run clustering
            </Button>
          }
        />
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Algorithm" htmlFor="cluster-algorithm">
                  <select
                    id="cluster-algorithm"
                    value={clusterForm.algorithm}
                    onChange={(event) =>
                      setClusterForm((current) => ({
                        ...current,
                        algorithm: event.target.value as "kmeans" | "dbscan",
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                  >
                    <option value="kmeans">K-Means</option>
                    <option value="dbscan">DBSCAN</option>
                  </select>
                </FormField>

                {clusterForm.algorithm === "kmeans" ? (
                  <FormField label="Clusters" htmlFor="n-clusters">
                    <input
                      id="n-clusters"
                      type="number"
                      min={2}
                      max={30}
                      value={clusterForm.n_clusters}
                      onChange={(event) =>
                        setClusterForm((current) => ({
                          ...current,
                          n_clusters: Number(event.target.value),
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                    />
                  </FormField>
                ) : (
                  <>
                    <FormField label="Eps (km)" htmlFor="eps-km">
                      <input
                        id="eps-km"
                        type="number"
                        step="0.5"
                        min={0.5}
                        max={10}
                        value={clusterForm.eps_km}
                        onChange={(event) =>
                          setClusterForm((current) => ({
                            ...current,
                            eps_km: Number(event.target.value),
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                      />
                    </FormField>
                    <FormField label="Min samples" htmlFor="min-samples">
                      <input
                        id="min-samples"
                        type="number"
                        min={5}
                        max={100}
                        value={clusterForm.min_samples}
                        onChange={(event) =>
                          setClusterForm((current) => ({
                            ...current,
                            min_samples: Number(event.target.value),
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                      />
                    </FormField>
                  </>
                )}
              </div>

              <FormField label="Severity filter" htmlFor="severity-filter">
                <div className="flex flex-wrap gap-2">
                  {["Minor", "Serious", "Fatal"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSeverity(value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        clusterForm.severity.includes(value)
                          ? "border-signal-400 bg-signal-50 text-signal-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Road type filter" htmlFor="road-type-filter">
                <select
                  id="road-type-filter"
                  value={clusterForm.road_type}
                  onChange={(event) =>
                    setClusterForm((current) => ({
                      ...current,
                      road_type: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                >
                  <option value="">All road types</option>
                  {["Urban Road", "Highway", "Rural Road", "Intersection"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="From date" htmlFor="date-from">
                  <input
                    id="date-from"
                    type="date"
                    value={clusterForm.date_from}
                    onChange={(event) =>
                      setClusterForm((current) => ({
                        ...current,
                        date_from: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                  />
                </FormField>
                <FormField label="To date" htmlFor="date-to">
                  <input
                    id="date-to"
                    type="date"
                    value={clusterForm.date_to}
                    onChange={(event) =>
                      setClusterForm((current) => ({
                        ...current,
                        date_to: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
                  />
                </FormField>
              </div>

              {clusterError ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{clusterError}</span>
                </div>
              ) : null}
            </div>

            <div>
              {clusterResult ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 font-semibold text-ink-700">
                      {clusterResult.cluster_count} clusters
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                      {formatNumber(clusterResult.sampled_points)} sampled
                    </span>
                    {clusterResult.algorithm === "dbscan" ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                        {formatPercent(clusterResult.noise_percentage / 100)} noise
                      </span>
                    ) : null}
                  </div>
                  <HotspotMap
                    clusters={clusterResult.clusters}
                    height={420}
                  />
                  <p className="text-[11px] text-slate-500">
                    Generated {new Date(clusterResult.generated_at).toLocaleString("en-GB")}.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                  <SlidersHorizontal className="h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    Run a filtered clustering
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    Adjust the parameters on the left and click run. Results render on
                    a fresh map without changing the precomputed clusters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
