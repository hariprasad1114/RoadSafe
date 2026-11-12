from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_hotspot_service
from app.schemas.hotspots import HotspotClusterRequest
from app.services.hotspots import HotspotService

router = APIRouter()


@router.get("/hotspots", tags=["hotspots"])
def list_hotspots(
    algorithm: Literal["kmeans", "dbscan"] = Query(default="kmeans"),
    limit: int = Query(default=50, ge=1, le=500),
    min_risk: float | None = Query(default=None, ge=0, le=100),
    hotspots: HotspotService = Depends(get_hotspot_service),
) -> dict:
    return hotspots.list_clusters(algorithm, limit=limit, min_risk=min_risk)


@router.get("/hotspots/summary", tags=["hotspots"])
def hotspot_summary(
    algorithm: Literal["kmeans", "dbscan"] = Query(default="kmeans"),
    hotspots: HotspotService = Depends(get_hotspot_service),
) -> dict:
    return hotspots.summary(algorithm)


@router.post("/hotspots/cluster", tags=["hotspots"])
def cluster_hotspots(
    payload: HotspotClusterRequest,
    hotspots: HotspotService = Depends(get_hotspot_service),
) -> dict:
    try:
        return hotspots.cluster(
            algorithm=payload.algorithm,
            n_clusters=payload.n_clusters,
            eps_km=payload.eps_km,
            min_samples=payload.min_samples,
            severity=payload.severity,
            road_type=payload.road_type,
            date_from=payload.date_from.isoformat() if payload.date_from else None,
            date_to=payload.date_to.isoformat() if payload.date_to else None,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": "CLUSTERING_ERROR", "message": str(exc)},
        ) from exc
