from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_recommendation_service
from app.services.recommendations import RecommendationService

router = APIRouter()


@router.get("/recommendations", tags=["recommendations"])
def list_recommendations(
    category: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    road_type: str | None = Query(default=None),
    recommendations: RecommendationService = Depends(get_recommendation_service),
) -> dict:
    return recommendations.list(category=category, priority=priority, road_type=road_type)


@router.get("/recommendations/{slug}", tags=["recommendations"])
def get_recommendation(
    slug: str,
    recommendations: RecommendationService = Depends(get_recommendation_service),
) -> dict:
    items = recommendations.list()["recommendations"]
    for item in items:
        if item.get("slug") == slug:
            return item
    raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Recommendation not found."})
