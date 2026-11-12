from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["Minor", "Serious", "Fatal"]


class HotspotClusterRequest(BaseModel):
    algorithm: Literal["kmeans", "dbscan"] = "kmeans"
    n_clusters: int = Field(default=12, ge=2, le=30)
    eps_km: float = Field(default=2.0, ge=0.5, le=10.0)
    min_samples: int = Field(default=20, ge=5, le=100)
    severity: list[Severity] | None = None
    road_type: str | None = Field(default=None, max_length=80)
    date_from: date | None = None
    date_to: date | None = None
