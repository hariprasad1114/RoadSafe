from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude of the collision location")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude of the collision location")
    road_type: str = Field(..., min_length=1, max_length=80)
    weather: str = Field(..., min_length=1, max_length=80)
    road_condition: str = Field(..., min_length=1, max_length=80)
    time_of_day: str = Field(..., min_length=1, max_length=80)
    day_of_week: str = Field(..., min_length=1, max_length=80)
    vehicle_type: str = Field(..., min_length=1, max_length=80)
    speed_limit: int = Field(..., ge=0, le=100)
    lighting_condition: str = Field(..., min_length=1, max_length=80)
    session_id: str | None = Field(default=None, max_length=120)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "latitude": 51.5074,
                "longitude": -0.1278,
                "road_type": "Urban Road",
                "weather": "Rainy",
                "road_condition": "Wet",
                "time_of_day": "Evening",
                "day_of_week": "Friday",
                "vehicle_type": "Two-Wheeler",
                "speed_limit": 30,
                "lighting_condition": "Moderate",
            }
        }
    )


class PredictionResponse(BaseModel):
    predicted_severity: str
    probabilities: dict[str, float]
    severe_probability: float
    fatal_probability: float
    risk_score: float
    risk_level: dict
    confidence: float
    predicted_probability: float
    risk_factors: list[dict]
    recommendations: list[dict]
    nearby_hotspots: list[dict]
    model: dict
    probability_note: str | None = None
    generated_at: datetime
