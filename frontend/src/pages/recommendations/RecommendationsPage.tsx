import { useMemo, useState } from "react";
import { BookOpen, Filter, Lightbulb, Search, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/hooks/useApi";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Recommendation, RecommendationListResponse } from "@/types";
import { cn, titleCase } from "@/lib/utils";
import { CATEGORY_STYLES } from "@/lib/constants";
import { PRIORITY_META } from "@/lib/utils";

export function RecommendationsPage() {
  useDocumentTitle("Recommendations");
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [roadType, setRoadType] = useState<string>("");
  const [search, setSearch] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);
    if (roadType) params.set("road_type", roadType);
    const query = params.toString();
    return `/api/v1/recommendations${query ? `?${query}` : ""}`;
  }, [category, priority, roadType]);

  const list = useApi<RecommendationListResponse>(url);

  const filtered = (list.data?.recommendations || []).filter((item) => {
    if (!search.trim()) return true;
    const haystack = `${item.title} ${item.summary} ${item.detail} ${item.evidence}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const categories = list.data?.categories || {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intervention planning"
        title="Evidence-led recommendations"
        description="Ten prioritised engineering, enforcement and education playbooks grounded in the UK DfT 2022 collision dataset."
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              {list.data?.count ?? 0} results
            </span>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search title, summary or evidence…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-ink-400 focus:ring-2 focus:ring-ink-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                <option value="">All categories</option>
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={roadType}
                onChange={(event) => setRoadType(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                <option value="">All road types</option>
                <option value="Urban Road">Urban Road</option>
                <option value="Highway">Highway</option>
                <option value="Rural Road">Rural Road</option>
                <option value="Intersection">Intersection</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {list.loading ? (
        <LoadingState label="Loading recommendations" />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refetch} />
      ) : filtered.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <Lightbulb className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No recommendations match
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Adjust the filters or clear the search to see the full catalogue.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <RecommendationCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const priorityMeta = PRIORITY_META[item.priority] || PRIORITY_META.medium;
  const categoryMeta =
    CATEGORY_STYLES[item.category] || {
      label: titleCase(item.category),
      tone: "indigo" as const,
    };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={item.title}
        description={item.summary}
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-50 text-signal-600">
            <Lightbulb className="h-4 w-4" />
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              tone={categoryMeta.tone}
              variant="soft"
              className="capitalize"
            >
              {categoryMeta.label}
            </Badge>
            <Badge
              tone={
                item.priority === "critical"
                  ? "rose"
                  : item.priority === "high"
                    ? "amber"
                    : item.priority === "medium"
                      ? "sky"
                      : "slate"
              }
              variant="soft"
              className="capitalize"
            >
              {priorityMeta.label}
            </Badge>
          </div>
        }
      />
      <CardContent className="flex flex-1 flex-col">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Road type
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {item.road_type || "All"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Weather
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {item.weather || "All"}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Evidence
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            {item.evidence}
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Impact estimate
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            {item.impact_estimate}
          </p>
        </div>

        {expanded ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs leading-relaxed text-slate-700">{item.detail}</p>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-semibold text-ink-600 transition hover:text-ink-900"
          >
            {expanded ? "Hide detail" : "Read full detail"}
          </button>
          <span className="text-[10px] text-slate-400">
            Sort order {item.sort_order}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
