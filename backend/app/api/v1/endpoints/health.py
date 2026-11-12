from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_client, get_model_service, get_repository
from app.core.config import Settings, get_settings
from app.schemas.common import HealthResponse
from app.services.data import DataRepository
from app.services.insforge import InsForgeClient
from app.services.model import ModelService

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health(
    settings: Settings = Depends(get_settings),
    client: InsForgeClient = Depends(get_client),
    data: DataRepository = Depends(get_repository),
    model: ModelService = Depends(get_model_service),
) -> HealthResponse:
    model_loaded = model.loaded
    return HealthResponse(
        status="ok" if model_loaded else "degraded",
        app=settings.app_name,
        version="1.0.0",
        model_loaded=model_loaded,
        database_configured=client.configured,
        data_source=data.source,
        data_loaded=data.is_loaded,
    )
