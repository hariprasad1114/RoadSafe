from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    get_analytics_service,
    get_hotspot_service,
    get_model_service,
    get_recommendation_service,
)
from app.services.analytics import DIMENSIONS, AnalyticsService
from app.services.hotspots import HotspotService
from app.services.model import ModelService
from app.services.recommendations import RecommendationService

router = APIRouter()


@router.get("/analytics/summary", tags=["analytics"])
def summary(analytics: AnalyticsService = Depends(get_analytics_service)) -> dict:
    return analytics.summary()


@router.get("/analytics/trends", tags=["analytics"])
def trends(
    granularity: Literal["day", "week", "month"] = Query(default="month"),
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> dict:
    return analytics.trends(granularity)


@router.get("/analytics/distributions", tags=["analytics"])
def distributions(
    dimension: str = Query(default="road_type", description="One of the available analysis dimensions"),
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> dict:
    return analytics.distributions(dimension)


@router.get("/analytics/dimensions", tags=["analytics"])
def dimensions() -> dict:
    return {"dimensions": [{"key": key, "label": label} for key, label in DIMENSIONS.items()]}


@router.get("/analytics/kpis", tags=["analytics"])
def kpis(
    analytics: AnalyticsService = Depends(get_analytics_service),
    model: ModelService = Depends(get_model_service),
    hotspots: HotspotService = Depends(get_hotspot_service),
    recommendations: RecommendationService = Depends(get_recommendation_service),
) -> dict:
    return analytics.kpis(
        model.metrics(),
        hotspots.summary("kmeans"),
        recommendations.count(),
    )
