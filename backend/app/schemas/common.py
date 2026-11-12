from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    model_loaded: bool
    database_configured: bool
    data_source: str
    data_loaded: bool


class MessageResponse(BaseModel):
    message: str
