from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import analytics, dataset, health, hotspots, metadata, predict, recommendations

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(metadata.router)
api_router.include_router(predict.router)
api_router.include_router(analytics.router)
api_router.include_router(hotspots.router)
api_router.include_router(recommendations.router)
api_router.include_router(dataset.router)
