from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings
from app.services.analytics import AnalyticsService
from app.services.data import DataRepository
from app.services.dataset import DatasetService
from app.services.hotspots import HotspotService
from app.services.insforge import InsForgeClient
from app.services.model import ModelService
from app.services.recommendations import RecommendationService


@dataclass
class AuthUser:
    id: str
    email: str | None
    role: str
    token: str


@lru_cache
def get_client() -> InsForgeClient:
    return InsForgeClient(get_settings())


@lru_cache
def get_repository() -> DataRepository:
    return DataRepository(get_settings(), get_client())


@lru_cache
def get_analytics_service() -> AnalyticsService:
    return AnalyticsService(get_repository())


@lru_cache
def get_recommendation_service() -> RecommendationService:
    return RecommendationService(get_settings(), get_client())


@lru_cache
def get_hotspot_service() -> HotspotService:
    return HotspotService(get_settings(), get_repository(), get_client())


@lru_cache
def get_model_service() -> ModelService:
    return ModelService(
        get_settings(),
        get_client(),
        get_recommendation_service(),
        get_hotspot_service(),
    )


@lru_cache
def get_dataset_service() -> DatasetService:
    return DatasetService(get_settings(), get_client(), get_repository())


def get_optional_user(request: Request) -> AuthUser | None:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header.split(" ", 1)[1].strip()
    if not token:
        return None
    client = get_client()
    user = client.current_user(token)
    if not user:
        return None
    user_id = str(user.get("id") or "")
    if not user_id:
        return None
    try:
        profile = client.get_profile(user_id)
    except Exception:
        profile = None
    role = profile.get("role") if profile else "analyst"
    return AuthUser(
        id=user_id,
        email=user.get("email") or (profile.get("email") if profile else None),
        role=role or "analyst",
        token=token,
    )


def get_current_user(user: AuthUser | None = Depends(get_optional_user)) -> AuthUser:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in with a valid InsForge session to use this endpoint.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires the admin role.",
        )
    return user


def settings_dependency() -> Settings:
    return get_settings()
