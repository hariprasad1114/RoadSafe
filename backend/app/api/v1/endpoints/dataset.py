from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.api.deps import AuthUser, get_dataset_service, require_admin
from app.services.dataset import DatasetService, DatasetValidationError

router = APIRouter()


def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    filename = file.filename or "dataset.csv"
    content = file.file.read()
    return content, filename


@router.post("/dataset/validate", tags=["dataset"])
def validate_dataset(
    file: UploadFile = File(..., description="CSV with the RoadSafe accident schema"),
    admin: AuthUser = Depends(require_admin),
    dataset: DatasetService = Depends(get_dataset_service),
) -> dict:
    content, filename = _read_upload(file)
    try:
        valid, report = dataset.validate_bytes(content, filename)
    except DatasetValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": "DATASET_VALIDATION_FAILED", "message": str(exc), "report": exc.report},
        ) from exc
    return {
        "status": "validated",
        "report": report,
        "can_import": len(valid) > 0,
        "requested_by": admin.email,
    }


@router.post("/dataset/import", status_code=202, tags=["dataset"])
def import_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSV with the RoadSafe accident schema"),
    admin: AuthUser = Depends(require_admin),
    dataset: DatasetService = Depends(get_dataset_service),
) -> dict:
    content, filename = _read_upload(file)
    try:
        valid, report = dataset.validate_bytes(content, filename)
    except DatasetValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": "DATASET_VALIDATION_FAILED", "message": str(exc), "report": exc.report},
        ) from exc

    result = dataset.start_import(
        user_id=admin.id,
        content=content,
        filename=filename,
        valid=valid,
        report=report,
    )
    records = result.pop("records")
    background_tasks.add_task(dataset.import_records, result["upload_id"], records, report)
    return result


@router.get("/dataset/uploads", tags=["dataset"])
def list_uploads(
    limit: int = Query(default=25, ge=1, le=100),
    admin: AuthUser = Depends(require_admin),
    dataset: DatasetService = Depends(get_dataset_service),
) -> dict:
    records = dataset.list_uploads(limit=limit)
    return {"count": len(records), "uploads": records}


@router.get("/dataset/template", tags=["dataset"])
def dataset_template(
    admin: AuthUser = Depends(require_admin),
    dataset: DatasetService = Depends(get_dataset_service),
) -> Response:
    return Response(
        content=dataset.template_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="roadsafe-dataset-template.csv"'},
    )


@router.get("/dataset/export", tags=["dataset"])
def export_dataset(
    severity: list[str] | None = Query(default=None),
    road_type: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    dataset: DatasetService = Depends(get_dataset_service),
) -> Response:
    allowed = {"Minor", "Serious", "Fatal"}
    if severity:
        invalid = [value for value in severity if value not in allowed]
        if invalid:
            raise HTTPException(
                status_code=422,
                detail={"error": "VALIDATION_ERROR", "message": f"Invalid severity filter: {invalid}"},
            )
    csv_content = dataset.export_csv(
        severity=severity,
        road_type=road_type,
        date_from=date_from,
        date_to=date_to,
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="roadsafe-export-{stamp}.csv"'},
    )
