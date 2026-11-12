from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans

from app.core.config import Settings
from app.services.data import DataRepository
from app.services.insforge import InsForgeClient
from app.utils.geo import haversine_km, nearest_city, project_to_km, unproject_from_km

logger = logging.getLogger(__name__)


def _float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class HotspotService:
    def __init__(self, settings: Settings, repository: DataRepository, client: InsForgeClient) -> None:
        self.settings = settings
        self.repository = repository
        self.client = client
        self._lock = threading.Lock()
        self._cache: dict[str, tuple[float, list[dict]]] = {}
        self.ttl = settings.data_cache_ttl_seconds
        self._fallback_path = settings.model_path / "hotspots_default.json"

    def _fallback(self, algorithm: str) -> list[dict]:
        if not self._fallback_path.exists():
            return []
        payload = json.loads(self._fallback_path.read_text(encoding="utf-8"))
        radius = 20.0 if algorithm == "kmeans" else 2.0
        clusters = []
        for item in payload.get(algorithm, []):
            total = _int(item.get("accident_count"))
            fatal = _int(item.get("fatal_count"))
            serious = _int(item.get("serious_count"))
            minor = _int(item.get("minor_count"))
            severe = fatal + serious
            severe_rate = round(severe / total, 4) if total else 0
            latitude = _float(item.get("latitude"))
            longitude = _float(item.get("longitude"))
            clusters.append(
                {
                    "cluster_id": _int(item.get("cluster_id")),
                    "algorithm": algorithm,
                    "label": f"{nearest_city(latitude, longitude)} area",
                    "latitude": latitude,
                    "longitude": longitude,
                    "accident_count": total,
                    "fatal_count": fatal,
                    "serious_count": serious,
                    "minor_count": minor,
                    "severity_rate": severe_rate,
                    "radius_km": radius,
                    "top_road_type": None,
                    "top_weather": item.get("most_common_weather"),
                    "risk_score": round(severe_rate * 100, 2),
                }
            )
        return clusters

    def _get_clusters(self, algorithm: str) -> list[dict]:
        algorithm = algorithm if algorithm in {"kmeans", "dbscan"} else "kmeans"
        with self._lock:
            cached = self._cache.get(algorithm)
            if cached and (time.time() - cached[0]) < self.ttl:
                return cached[1]

        clusters: list[dict] = []
        if self.client.configured:
            try:
                records = self.client.get_records(
                    "hotspots",
                    params={
                        "select": "*",
                        "algorithm": f"eq.{algorithm}",
                        "order": "accident_count.desc",
                    },
                )
                if records:
                    clusters = [
                        {
                            **record,
                            "cluster_id": _int(record.get("cluster_id")),
                            "latitude": _float(record.get("latitude")),
                            "longitude": _float(record.get("longitude")),
                            "accident_count": _int(record.get("accident_count")),
                            "fatal_count": _int(record.get("fatal_count")),
                            "serious_count": _int(record.get("serious_count")),
                            "minor_count": _int(record.get("minor_count")),
                            "severity_rate": _float(record.get("severity_rate")),
                            "radius_km": _float(record.get("radius_km")),
                            "risk_score": _float(record.get("risk_score")),
                        }
                        for record in records
                    ]
            except Exception as exc:
                logger.warning("Could not load hotspots from InsForge: %s", exc)
        if not clusters:
            clusters = self._fallback(algorithm)

        with self._lock:
            self._cache[algorithm] = (time.time(), clusters)
        return clusters

    def list_clusters(
        self,
        algorithm: str = "kmeans",
        *,
        limit: int = 50,
        min_risk: float | None = None,
    ) -> dict:
        clusters = self._get_clusters(algorithm)
        if min_risk is not None:
            clusters = [item for item in clusters if item["risk_score"] >= min_risk]
        clusters = sorted(
            clusters,
            key=lambda item: (item["risk_score"], item["accident_count"]),
            reverse=True,
        )
        total = len(clusters)
        return {
            "algorithm": algorithm,
            "count": total,
            "clusters": clusters[: max(1, min(limit, 500))],
            "source": "insforge" if self.client.configured else "bundled",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def summary(self, algorithm: str = "kmeans") -> dict:
        clusters = self._get_clusters(algorithm)
        total_accidents = sum(item["accident_count"] for item in clusters)
        risk_scores = [item["risk_score"] for item in clusters]
        top = sorted(clusters, key=lambda item: (item["risk_score"], item["accident_count"]), reverse=True)[:5]
        return {
            "algorithm": algorithm,
            "cluster_count": len(clusters),
            "covered_accidents": total_accidents,
            "average_risk": round(sum(risk_scores) / len(risk_scores), 2) if risk_scores else 0,
            "highest_risk": round(max(risk_scores), 2) if risk_scores else 0,
            "top_clusters": top,
        }

    def _sample(self, frame: pd.DataFrame, max_points: int) -> pd.DataFrame:
        if len(frame) <= max_points:
            return frame
        parts = []
        total = len(frame)
        for _, group in frame.groupby("severity"):
            target = max(1, int(round(max_points * len(group) / total)))
            parts.append(group.sample(n=min(target, len(group)), random_state=42))
        sample = pd.concat(parts)
        if len(sample) > max_points:
            sample = sample.sample(n=max_points, random_state=42)
        return sample

    def cluster(
        self,
        *,
        algorithm: str = "kmeans",
        n_clusters: int = 12,
        eps_km: float = 2.0,
        min_samples: int = 20,
        severity: list[str] | None = None,
        road_type: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> dict:
        algorithm = algorithm if algorithm in {"kmeans", "dbscan"} else "kmeans"
        frame = self.repository.get().copy()
        if severity:
            frame = frame[frame["severity"].isin(severity)]
        if road_type:
            frame = frame[frame["road_type"] == road_type]
        if date_from:
            frame = frame[frame["accident_date"] >= pd.to_datetime(date_from)]
        if date_to:
            frame = frame[frame["accident_date"] <= pd.to_datetime(date_to)]
        frame = frame.dropna(subset=["latitude", "longitude"])
        if len(frame) < 10:
            raise ValueError("Not enough accident records match these filters to cluster.")

        total_points = len(frame)
        sample = self._sample(frame, self.settings.max_dbscan_points)
        latitudes = sample["latitude"].to_numpy(dtype=float)
        longitudes = sample["longitude"].to_numpy(dtype=float)

        if algorithm == "kmeans":
            x, y = project_to_km(latitudes, longitudes)
            matrix = np.column_stack([x, y])
            n_clusters = max(2, min(n_clusters, 30, len(sample) // 5))
            model = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
            labels = model.fit_predict(matrix)
            mean_latitude = float(np.mean(latitudes))
            centers = [unproject_from_km(cx, cy, mean_latitude) for cx, cy in model.cluster_centers_]
            radius_percentile = 95
        else:
            radians = np.radians(np.column_stack([latitudes, longitudes]))
            model = DBSCAN(
                eps=max(0.5, min(eps_km, 10.0)) / 6371.0088,
                min_samples=max(5, min(min_samples, 100)),
                metric="haversine",
                algorithm="ball_tree",
            )
            labels = model.fit_predict(radians)
            unique_labels = sorted({int(label) for label in labels if label != -1})
            centers = []
            for label in unique_labels:
                mask = labels == label
                centers.append((float(latitudes[mask].mean()), float(longitudes[mask].mean())))
            radius_percentile = 90

        sample = sample.reset_index(drop=True)
        sample["cluster_label"] = labels
        clusters: list[dict] = []
        for index, label in enumerate(sorted({int(value) for value in labels if value != -1})):
            mask = sample["cluster_label"] == label
            subset = sample[mask]
            if subset.empty:
                continue
            center_latitude, center_longitude = centers[index] if index < len(centers) else (
                float(subset["latitude"].mean()),
                float(subset["longitude"].mean()),
            )
            distances = haversine_km(
                subset["latitude"].to_numpy(dtype=float),
                subset["longitude"].to_numpy(dtype=float),
                center_latitude,
                center_longitude,
            )
            total = int(len(subset))
            fatal = int((subset["severity"] == "Fatal").sum())
            serious = int((subset["severity"] == "Serious").sum())
            minor = int((subset["severity"] == "Minor").sum())
            severe_rate = round((fatal + serious) / total, 4) if total else 0
            road_mode = subset["road_type"].value_counts().index[0]
            weather_mode = subset["weather"].value_counts().index[0]
            clusters.append(
                {
                    "cluster_id": label,
                    "algorithm": algorithm,
                    "label": f"{nearest_city(center_latitude, center_longitude)} area",
                    "latitude": round(center_latitude, 6),
                    "longitude": round(center_longitude, 6),
                    "accident_count": total,
                    "fatal_count": fatal,
                    "serious_count": serious,
                    "minor_count": minor,
                    "severity_rate": severe_rate,
                    "radius_km": round(float(np.percentile(distances, radius_percentile)), 2),
                    "top_road_type": road_mode,
                    "top_weather": weather_mode,
                    "risk_score": round(severe_rate * 100, 2),
                }
            )

        clusters.sort(key=lambda item: (item["risk_score"], item["accident_count"]), reverse=True)
        noise_count = int((labels == -1).sum()) if algorithm == "dbscan" else 0
        return {
            "algorithm": algorithm,
            "params": {
                "n_clusters": n_clusters if algorithm == "kmeans" else None,
                "eps_km": eps_km if algorithm == "dbscan" else None,
                "min_samples": min_samples if algorithm == "dbscan" else None,
                "severity": severity,
                "road_type": road_type,
                "date_from": date_from,
                "date_to": date_to,
            },
            "total_points": total_points,
            "sampled_points": int(len(sample)),
            "noise_count": noise_count,
            "noise_percentage": round(noise_count / len(sample) * 100, 2) if len(sample) else 0,
            "cluster_count": len(clusters),
            "clusters": clusters,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
