from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from app.ml.features import CLASS_ORDER
from app.services.data import DAY_ORDER, TIME_ORDER, DataRepository

DIMENSIONS = {
    "road_type": "Road type",
    "weather": "Weather",
    "vehicle_type": "Vehicle type",
    "time_of_day": "Time of day",
    "day_of_week": "Day of week",
    "lighting_condition": "Lighting",
    "road_condition": "Road condition",
    "speed_limit": "Speed limit",
    "month": "Month",
    "severity": "Severity",
}

ORDERED_DIMENSIONS = {
    "day_of_week": DAY_ORDER,
    "time_of_day": TIME_ORDER,
    "severity": CLASS_ORDER,
}

GRANULARITIES = {"day", "week", "month"}


class AnalyticsService:
    def __init__(self, repository: DataRepository) -> None:
        self.repository = repository

    def _frame(self) -> pd.DataFrame:
        return self.repository.get()

    def summary(self) -> dict:
        frame = self._frame()
        total = int(len(frame))
        counts = {label: int((frame["severity"] == label).sum()) for label in CLASS_ORDER}
        severe = counts.get("Serious", 0) + counts.get("Fatal", 0)
        dates = frame["accident_date"].dropna()
        top_road = frame["road_type"].value_counts().index[0] if total else None
        top_weather = frame["weather"].value_counts().index[0] if total else None
        return {
            "total_accidents": total,
            "severity_counts": counts,
            "severe_count": severe,
            "severe_rate": round(severe / total, 4) if total else 0,
            "fatal_rate": round(counts.get("Fatal", 0) / total, 4) if total else 0,
            "date_range": {
                "start": dates.min().date().isoformat() if not dates.empty else None,
                "end": dates.max().date().isoformat() if not dates.empty else None,
            },
            "top_road_type": top_road,
            "top_weather": top_weather,
            "average_speed_limit": round(float(frame["speed_limit"].mean()), 1) if total else 0,
            "night_share": round(float((frame["time_of_day"] == "Night").mean()), 4) if total else 0,
            "wet_share": round(
                float(frame["road_condition"].isin(["Wet", "Flooded", "Snowy/Icy"]).mean()), 4
            )
            if total
            else 0,
            "two_wheeler_share": round(float((frame["vehicle_type"] == "Two-Wheeler").mean()), 4)
            if total
            else 0,
            "data_source": self.repository.source,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def trends(self, granularity: str = "month") -> dict:
        granularity = granularity if granularity in GRANULARITIES else "month"
        frame = self._frame()
        data = frame.dropna(subset=["accident_date"]).copy()
        if granularity == "day":
            data["period"] = data["accident_date"].dt.floor("D")
            labels = data["period"].dt.strftime("%d %b %Y")
        elif granularity == "week":
            data["period"] = data["accident_date"].dt.to_period("W").dt.start_time
            labels = data["period"].dt.strftime("Week of %d %b %Y")
        else:
            data["period"] = data["accident_date"].dt.to_period("M").dt.start_time
            labels = data["period"].dt.strftime("%b %Y")

        data["fatal"] = (data["severity"] == "Fatal").astype(int)
        data["serious"] = (data["severity"] == "Serious").astype(int)
        data["minor"] = (data["severity"] == "Minor").astype(int)
        data["label"] = labels
        grouped = (
            data.groupby(["period", "label"], as_index=False)
            .agg(total=("severity", "size"), fatal=("fatal", "sum"), serious=("serious", "sum"), minor=("minor", "sum"))
            .sort_values("period")
        )
        grouped["severe"] = grouped["fatal"] + grouped["serious"]
        grouped["severe_rate"] = (grouped["severe"] / grouped["total"]).round(4)
        grouped["period"] = grouped["period"].dt.strftime("%Y-%m-%d")
        return {
            "granularity": granularity,
            "points": grouped.to_dict(orient="records"),
            "data_source": self.repository.source,
        }

    def distributions(self, dimension: str = "road_type") -> dict:
        dimension = dimension if dimension in DIMENSIONS else "road_type"
        frame = self._frame()
        if dimension == "month":
            frame = frame.dropna(subset=["accident_date"]).copy()
            frame["month"] = frame["accident_date"].dt.strftime("%Y-%m")
        data = frame.copy()
        data["fatal"] = (data["severity"] == "Fatal").astype(int)
        data["serious"] = (data["severity"] == "Serious").astype(int)
        data["minor"] = (data["severity"] == "Minor").astype(int)
        grouped = (
            data.groupby(dimension, dropna=False)
            .agg(total=("severity", "size"), fatal=("fatal", "sum"), serious=("serious", "sum"), minor=("minor", "sum"))
            .reset_index()
        )
        grouped[dimension] = grouped[dimension].astype(str)
        grouped["severe"] = grouped["fatal"] + grouped["serious"]
        grouped["severe_rate"] = (grouped["severe"] / grouped["total"]).round(4)
        total = int(grouped["total"].sum())
        grouped["share"] = (grouped["total"] / total).round(4) if total else 0

        if dimension in ORDERED_DIMENSIONS:
            order = {value: index for index, value in enumerate(ORDERED_DIMENSIONS[dimension])}
            grouped["_order"] = grouped[dimension].map(order).fillna(len(order))
            grouped = grouped.sort_values(["_order", "total"], ascending=[True, False])
        elif dimension == "speed_limit":
            grouped["_order"] = pd.to_numeric(grouped[dimension], errors="coerce").fillna(0)
            grouped = grouped.sort_values("_order")
        elif dimension == "month":
            grouped = grouped.sort_values(dimension)
        else:
            grouped = grouped.sort_values("total", ascending=False)

        grouped = grouped.drop(columns=[column for column in ["_order"] if column in grouped.columns])
        grouped[dimension] = grouped[dimension].replace({"nan": "Unknown"})
        return {
            "dimension": dimension,
            "label": DIMENSIONS[dimension],
            "values": grouped.to_dict(orient="records"),
            "total": total,
            "data_source": self.repository.source,
        }

    def kpis(self, model_metrics: dict, hotspot_summary: dict, recommendation_count: int) -> dict:
        summary = self.summary()
        per_class = model_metrics.get("metrics", {}).get("per_class", {})
        return {
            "total_accidents": summary["total_accidents"],
            "severe_count": summary["severe_count"],
            "severe_rate": summary["severe_rate"],
            "fatal_count": summary["severity_counts"].get("Fatal", 0),
            "fatal_rate": summary["fatal_rate"],
            "top_road_type": summary["top_road_type"],
            "top_weather": summary["top_weather"],
            "hotspot_count": hotspot_summary.get("cluster_count", 0),
            "recommendation_count": recommendation_count,
            "model": {
                "name": model_metrics.get("model_name"),
                "version": model_metrics.get("model_version"),
                "accuracy": model_metrics.get("metrics", {}).get("accuracy"),
                "macro_f1": model_metrics.get("metrics", {}).get("macro_f1"),
                "fatal_recall": per_class.get("Fatal", {}).get("recall"),
                "serious_recall": per_class.get("Serious", {}).get("recall"),
                "trained_at": model_metrics.get("trained_at"),
            },
            "data_source": self.repository.source,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
