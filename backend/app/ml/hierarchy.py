from __future__ import annotations

import numpy as np

from app.ml.features import CLASS_ORDER


class HierarchicalSeverityModel:
    def __init__(
        self,
        severe_pipeline,
        fatal_pipeline,
        fatal_threshold: float = 0.15,
        serious_weight: float = 1.5,
        class_order: list[str] | None = None,
    ) -> None:
        self.severe_pipeline = severe_pipeline
        self.fatal_pipeline = fatal_pipeline
        self.fatal_threshold = float(fatal_threshold)
        self.serious_weight = float(serious_weight)
        self.classes_ = np.array(class_order or CLASS_ORDER)
        self.model_kind = "hierarchical_random_forest"

    def predict_proba(self, features) -> np.ndarray:
        severe_probability = self.severe_pipeline.predict_proba(features)[:, 1]
        fatal_probability = self.fatal_pipeline.predict_proba(features)[:, 1]
        fatal = severe_probability * fatal_probability
        serious = severe_probability * (1.0 - fatal_probability)
        minor = 1.0 - severe_probability
        probabilities = np.column_stack([minor, serious, fatal])
        return np.clip(probabilities, 0.0, 1.0)

    def decide(self, probabilities: np.ndarray) -> np.ndarray:
        rows = np.atleast_2d(probabilities)
        labels: list[str] = []
        for minor, serious, fatal in rows:
            if fatal >= self.fatal_threshold:
                labels.append("Fatal")
            elif serious * self.serious_weight >= minor:
                labels.append("Serious")
            else:
                labels.append("Minor")
        return np.array(labels)

    def predict(self, features) -> np.ndarray:
        return self.decide(self.predict_proba(features))

    def get_params(self, deep: bool = True) -> dict:
        return {
            "severe_pipeline": self.severe_pipeline,
            "fatal_pipeline": self.fatal_pipeline,
            "fatal_threshold": self.fatal_threshold,
            "serious_weight": self.serious_weight,
            "class_order": list(self.classes_),
        }
