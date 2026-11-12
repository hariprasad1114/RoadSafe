from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.api.deps import AuthUser, get_client, get_model_service, get_optional_user, get_current_user
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.insforge import InsForgeClient
from app.services.model import ModelService, PredictionValidationError

router = APIRouter()


@router.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["prediction"],
    summary="Predict collision severity",
)
def predict(
    payload: PredictionRequest,
    background_tasks: BackgroundTasks,
    model: ModelService = Depends(get_model_service),
    user: AuthUser | None = Depends(get_optional_user),
) -> PredictionResponse:
    data = payload.model_dump()
    try:
        result = model.predict(data)
    except PredictionValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "VALIDATION_ERROR",
                "message": str(exc),
                "field": exc.field,
                "allowed": exc.allowed,
                "bounds": exc.bounds,
            },
        ) from exc

    background_tasks.add_task(
        model.record,
        data,
        result,
        user_id=user.id if user else None,
        token=user.token if user else None,
        session_id=payload.session_id,
    )
    return PredictionResponse(**result)


@router.get("/predict/history", tags=["prediction"])
def prediction_history(
    limit: int = Query(default=25, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    client: InsForgeClient = Depends(get_client),
) -> dict:
    try:
        records = client.get_records(
            "predictions",
            params={"select": "*", "order": "created_at.desc", "limit": limit},
            token=user.token,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": "SESSION_ERROR", "message": "Could not load prediction history. Please sign in again."},
        ) from exc
    return {"count": len(records), "predictions": records}
