from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import (
    get_client,
    get_hotspot_service,
    get_model_service,
    get_recommendation_service,
    get_repository,
)
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.rate_limit import RateLimitMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("roadsafe")

settings = get_settings()


def _warm_caches() -> None:
    try:
        get_model_service().metadata()
        get_recommendation_service().list()
        get_hotspot_service().list_clusters("kmeans", limit=50)
        if settings.warm_dataset_cache:
            get_repository().get()
        logger.info("RoadSafe caches warmed")
    except Exception:
        logger.exception("Cache warm-up failed; requests will load data lazily")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (%s)", settings.app_name, settings.environment)
    threading.Thread(target=_warm_caches, name="roadsafe-warmup", daemon=True).start()
    yield
    get_client().close()


app = FastAPI(
    title="RoadSafe AI ML API",
    description=(
        "Collision severity prediction, hotspot clustering, analytics, recommendations and "
        "dataset management for the RoadSafe AI road-safety platform."
    ),
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "RoadSafe AI"},
    license_info={"name": "Open Government Licence v3.0 for the source dataset"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Prefer"],
)
app.add_middleware(RateLimitMiddleware, limit=settings.rate_limit_per_minute)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["system"])
def root_health() -> dict:
    model = get_model_service()
    data = get_repository()
    client = get_client()
    return {
        "status": "ok" if model.loaded else "degraded",
        "app": settings.app_name,
        "version": "1.0.0",
        "model_loaded": model.loaded,
        "database_configured": client.configured,
        "data_source": data.source,
        "data_loaded": data.is_loaded,
    }


@app.get("/", tags=["system"])
def root() -> dict:
    return {
        "name": "RoadSafe AI ML API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_v1_prefix,
    }
