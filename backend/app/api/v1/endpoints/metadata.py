from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_hotspot_service, get_model_service, get_repository
from app.services.data import DataRepository
from app.services.dataset import DATASET_COLUMNS, TEMPLATE_ROW
from app.services.hotspots import HotspotService
from app.services.model import ModelService

router = APIRouter()


@router.get("/metadata", tags=["metadata"])
def metadata(
    model: ModelService = Depends(get_model_service),
    hotspots: HotspotService = Depends(get_hotspot_service),
    data: DataRepository = Depends(get_repository),
) -> dict:
    payload = model.public_metadata()
    kmeans = hotspots.summary("kmeans")
    dbscan = hotspots.summary("dbscan")
    payload.update(
        {
            "api_version": "1.0.0",
            "data_status": data.status(),
            "hotspot_algorithms": {
                "kmeans": {
                    "label": "K-Means regional clusters",
                    "clusters": kmeans["cluster_count"],
                    "description": "Partitions all accident locations into broad regional clusters.",
                },
                "dbscan": {
                    "label": "DBSCAN dense clusters",
                    "clusters": dbscan["cluster_count"],
                    "description": "Finds dense local clusters and labels sparse points as noise.",
                },
            },
            "dataset_columns": DATASET_COLUMNS,
            "dataset_template_example": TEMPLATE_ROW,
            "dimensions": [
                "road_type",
                "weather",
                "vehicle_type",
                "time_of_day",
                "day_of_week",
                "lighting_condition",
                "road_condition",
                "speed_limit",
                "month",
            ],
        }
    )
    return payload
