from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd

from app.core.config import Settings
from app.ml.features import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    CLASS_ORDER,
    NUMERIC_FEATURES,
    RAW_FEATURES,
    add_derived_features,
    prepare_features,
)
from app.services.hotspots import HotspotService
from app.services.insforge import InsForgeClient
from app.services.recommendations import RecommendationService
from app.utils.geo import haversine_km

logger = logging.getLogger(__name__)

RISK_FACTORS = {
    "is_night": "Night-time travel",
    "is_poor_lighting": "Poor or no lighting",
    "is_wet": "Wet, flooded or icy road",
    "is_high_speed": "Speed limit of 50 mph or above",
    "is_two_wheeler": "Two-wheeler involved",
    "is_intersection": "Intersection",
    "is_weekend": "Weekend travel",
}

RISK_LEVELS = [
    {"key": "low", "label": "Low", "min_severe_probability": 0.0},
    {"key": "moderate", "label": "Moderate", "min_severe_probability": 0.2},
    {"key": "high", "label": "High", "min_severe_probability": 0.4},
    {"key": "very_high", "label": "Very high", "min_severe_probability": 0.6},
]


class PredictionValidationError(ValueError):
    def __init__(self, field: str, value, allowed: list[str] | None = None) -> None:
        self.field = field
        self.value = value
        self.allowed = allowed
        if allowed:
            message = f"Invalid value for {field}: {value!r}. Allowed values: {', '.join(allowed)}"
        else:
            message = f"Invalid value for {field}: {value!r}"
        super().__init__(message)


class ModelService:
    def __init__(
        self,
        settings: Settings,
        client: InsForgeClient,
        recommendations: RecommendationService,
        hotspots: HotspotService,
    ) -> None:
        self.settings = settings
        self.client = client
        self.recommendations = recommendations
        self.hotspots = hotspots
        self._lock = threading.Lock()
        self._model = None
        self._metrics: dict | None = None
        self._metadata: dict | None = None

    @property
    def model_path(self):
        return self.settings.model_path / "severity_pipeline.joblib"

    @property
    def metrics_path(self):
        return self.settings.model_path / "severity_metrics.json"

    @property
    def metadata_path(self):
        return self.settings.model_path / "severity_metadata.json"

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            if not self.model_path.exists():
                raise FileNotFoundError(f"Severity model not found at {self.model_path}")
            self._model = joblib.load(self.model_path)
            self._metrics = json.loads(self.metrics_path.read_text(encoding="utf-8"))
            self._metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def loaded(self) -> bool:
        return self.model_path.exists()

    def metrics(self) -> dict:
        self._load()
        return self._metrics or {}

    def metadata(self) -> dict:
        self._load()
        return self._metadata or {}

    def public_metadata(self) -> dict:
        metadata = self.metadata()
        metrics = self.metrics()
        bounds = metadata.get("bounds", {})
        defaults = {
            "latitude": bounds.get("center_latitude", 52.5),
            "longitude": bounds.get("center_longitude", -1.5),
            "road_type": "Urban Road",
            "weather": "Clear",
            "road_condition": "Dry",
            "time_of_day": "Afternoon",
            "day_of_week": "Friday",
            "vehicle_type": "Car",
            "speed_limit": 30,
            "lighting_condition": "Good",
        }
        categories = metadata.get("categories", {})
        for field, fallback in [
            ("road_type", "Urban Road"),
            ("weather", "Clear"),
            ("road_condition", "Dry"),
            ("time_of_day", "Afternoon"),
            ("day_of_week", "Friday"),
            ("vehicle_type", "Car"),
            ("lighting_condition", "Good"),
        ]:
            allowed = categories.get(field, [])
            if allowed and defaults[field] not in allowed:
                defaults[field] = allowed[0]
        return {
            "model_name": metrics.get("model_name"),
            "model_kind": metrics.get("model_kind"),
            "model_version": metrics.get("model_version"),
            "trained_at": metrics.get("trained_at"),
            "dataset_rows": metrics.get("dataset_rows"),
            "dataset_source": metrics.get("dataset_source"),
            "dataset_licence": metrics.get("dataset_licence"),
            "class_order": CLASS_ORDER,
            "class_counts": metrics.get("class_counts", {}),
            "features": ALL_FEATURES,
            "raw_features": RAW_FEATURES,
            "derived_features": metadata.get("derived_features", []),
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "categories": categories,
            "ranges": metadata.get("ranges", {}),
            "bounds": bounds,
            "defaults": defaults,
            "decision_rule": metadata.get("decision_rule", {}),
            "risk_levels": RISK_LEVELS,
            "risk_factors": RISK_FACTORS,
            "probability_note": metadata.get("probability_note"),
            "performance_note": metadata.get("performance_note"),
            "disclaimer": (
                "RoadSafe AI is a decision-support tool trained on historical UK collision data. "
                "Predictions are estimates, not guarantees, and must not replace professional "
                "road-safety engineering judgement or live operational intelligence."
            ),
        }

    def _validate(self, data: dict) -> None:
        metadata = self.metadata()
        categories = metadata.get("categories", {})
        for field in CATEGORICAL_FEATURES:
            allowed = categories.get(field)
            if allowed and data[field] not in allowed:
                raise PredictionValidationError(field, data[field], allowed)
        bounds = metadata.get("bounds", {})
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])
        if not (bounds.get("min_latitude", -90) <= latitude <= bounds.get("max_latitude", 90)):
            raise PredictionValidationError("latitude", latitude)
        if not (bounds.get("min_longitude", -180) <= longitude <= bounds.get("max_longitude", 180)):
            raise PredictionValidationError("longitude", longitude)
        speed = float(data["speed_limit"])
        if speed < 0 or speed > 100:
            raise PredictionValidationError("speed_limit", speed)

    def _nearby_hotspots(self, latitude: float, longitude: float, radius_km: float = 50.0, limit: int = 3) -> list[dict]:
        try:
            clusters = self.hotspots.list_clusters("kmeans", limit=200)["clusters"]
        except Exception:
            return []
        scored = []
        for cluster in clusters:
            distance = float(
                haversine_km(latitude, longitude, cluster["latitude"], cluster["longitude"])
            )
            if distance <= radius_km:
                scored.append(
                    {
                        "label": cluster.get("label"),
                        "cluster_id": cluster.get("cluster_id"),
                        "latitude": cluster.get("latitude"),
                        "longitude": cluster.get("longitude"),
                        "distance_km": round(distance, 2),
                        "risk_score": cluster.get("risk_score"),
                        "accident_count": cluster.get("accident_count"),
                    }
                )
        scored.sort(key=lambda item: item["distance_km"])
        return scored[:limit]

    def _risk_level(self, severe_probability: float) -> dict:
        level = RISK_LEVELS[0]
        for candidate in RISK_LEVELS:
            if severe_probability >= candidate["min_severe_probability"]:
                level = candidate
        return level

    def predict(self, data: dict, *, include_nearby: bool = True) -> dict:
        self._load()
        self._validate(data)
        row = {field: data[field] for field in RAW_FEATURES}
        frame = prepare_features(pd.DataFrame([row]))
        probabilities = self._model.predict_proba(frame)[0]
        probabilities = np.asarray(probabilities, dtype=float)
        predicted = str(self._model.decide(probabilities.reshape(1, -1))[0])
        probability_map = {
            label: round(float(probabilities[index]), 6)
            for index, label in enumerate(CLASS_ORDER)
        }
        severe_probability = probability_map["Serious"] + probability_map["Fatal"]
        derived = add_derived_features(pd.DataFrame([row]))
        active_factors = [
            {"key": key, "label": label}
            for key, label in RISK_FACTORS.items()
            if int(derived.iloc[0].get(key, 0)) == 1
        ]
        risk_level = self._risk_level(severe_probability)
        metadata = self.metadata()
        return {
            "predicted_severity": predicted,
            "probabilities": probability_map,
            "severe_probability": round(severe_probability, 6),
            "fatal_probability": probability_map["Fatal"],
            "risk_score": round(severe_probability * 100, 2),
            "risk_level": risk_level,
            "confidence": round(max(probability_map.values()), 4),
            "predicted_probability": round(probability_map[predicted], 4),
            "risk_factors": active_factors,
            "recommendations": self.recommendations.for_context(data.get("road_type"), data.get("weather")),
            "nearby_hotspots": self._nearby_hotspots(float(data["latitude"]), float(data["longitude"])) if include_nearby else [],
            "model": {
                "name": metadata.get("model_name") or self.metrics().get("model_name"),
                "version": self.metrics().get("model_version"),
                "kind": self.metrics().get("model_kind"),
                "decision_rule": metadata.get("decision_rule", {}),
            },
            "probability_note": metadata.get("probability_note"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def record(
        self,
        data: dict,
        result: dict,
        *,
        user_id: str | None = None,
        token: str | None = None,
        session_id: str | None = None,
    ) -> None:
        if not self.client.configured:
            return
        document = {
            "session_id": session_id,
            "input": {field: data[field] for field in RAW_FEATURES},
            "predicted_severity": result["predicted_severity"],
            "probabilities": result["probabilities"],
            "model_version": result["model"]["version"],
        }
        if user_id:
            document["user_id"] = user_id
        try:
            self.client.insert_records(
                "predictions",
                [document],
                token=token if user_id else None,
                admin=False,
            )
        except Exception as exc:
            logger.info("Prediction was not recorded: %s", exc)
