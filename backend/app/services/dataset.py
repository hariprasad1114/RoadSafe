from __future__ import annotations

import io
import json
import logging
import re
import uuid
from datetime import datetime, timezone

import pandas as pd

from app.core.config import Settings
from app.ml.features import CLASS_ORDER
from app.services.data import DataRepository
from app.services.insforge import InsForgeClient

logger = logging.getLogger(__name__)

DATASET_COLUMNS = [
    "accident_id",
    "accident_date",
    "latitude",
    "longitude",
    "time_of_day",
    "day_of_week",
    "weather",
    "road_condition",
    "road_type",
    "vehicle_type",
    "speed_limit",
    "lighting_condition",
    "severity",
    "source_dataset",
]

REQUIRED_COLUMNS = DATASET_COLUMNS[:-1]

TEMPLATE_ROW = {
    "accident_id": "2022S000001",
    "accident_date": "2022-01-01",
    "latitude": "51.5074",
    "longitude": "-0.1278",
    "time_of_day": "Afternoon",
    "day_of_week": "Saturday",
    "weather": "Clear",
    "road_condition": "Dry",
    "road_type": "Urban Road",
    "vehicle_type": "Car",
    "speed_limit": "30",
    "lighting_condition": "Good",
    "severity": "Serious",
    "source_dataset": "uploaded-csv",
}

MAX_ROWS = 250_000


class DatasetValidationError(ValueError):
    def __init__(self, message: str, report: dict | None = None) -> None:
        self.report = report or {}
        super().__init__(message)


class DatasetService:
    def __init__(self, settings: Settings, client: InsForgeClient, repository: DataRepository) -> None:
        self.settings = settings
        self.client = client
        self.repository = repository

    def _read_csv(self, content: bytes) -> pd.DataFrame:
        try:
            return pd.read_csv(io.BytesIO(content), low_memory=False)
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(content), low_memory=False, encoding="latin-1")

    def validate_bytes(self, content: bytes, filename: str) -> tuple[pd.DataFrame, dict]:
        if not content:
            raise DatasetValidationError("The uploaded file is empty.")
        max_bytes = self.settings.max_upload_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise DatasetValidationError(
                f"File is too large. The limit is {self.settings.max_upload_mb} MB."
            )

        try:
            frame = self._read_csv(content)
        except Exception as exc:
            raise DatasetValidationError(f"Could not read the CSV file: {exc}") from exc

        frame.columns = [str(column).strip() for column in frame.columns]
        missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
        extra = [column for column in frame.columns if column not in DATASET_COLUMNS]
        if missing:
            report = {
                "file_name": filename,
                "missing_columns": missing,
                "extra_columns": extra,
                "required_columns": REQUIRED_COLUMNS,
            }
            raise DatasetValidationError(
                "The CSV is missing required columns: " + ", ".join(missing), report
            )

        if len(frame) > MAX_ROWS:
            raise DatasetValidationError(
                f"The CSV has {len(frame):,} rows. The maximum supported upload is {MAX_ROWS:,} rows."
            )

        frame = frame.copy()
        frame["accident_id"] = frame["accident_id"].astype(str).str.strip()
        frame["source_dataset"] = (
            frame["source_dataset"].fillna(filename).astype(str).str.strip()
            if "source_dataset" in frame.columns
            else filename
        )
        for column in [
            "time_of_day",
            "day_of_week",
            "weather",
            "road_condition",
            "road_type",
            "vehicle_type",
            "lighting_condition",
            "severity",
        ]:
            frame[column] = frame[column].fillna("").astype(str).str.strip()

        dates = pd.to_datetime(frame["accident_date"], errors="coerce")
        latitudes = pd.to_numeric(frame["latitude"], errors="coerce")
        longitudes = pd.to_numeric(frame["longitude"], errors="coerce")
        speeds = pd.to_numeric(frame["speed_limit"], errors="coerce")

        reasons: dict[str, int] = {}

        def flag(mask: pd.Series, label: str) -> pd.Series:
            mask = mask.fillna(True)
            reasons[label] = int(mask.sum())
            return mask

        invalid_id = flag(frame["accident_id"].eq("") | frame["accident_id"].eq("nan"), "missing accident_id")
        invalid_date = flag(dates.isna(), "invalid accident_date")
        invalid_lat = flag(latitudes.isna() | ~latitudes.between(49.0, 61.5), "invalid latitude")
        invalid_lon = flag(longitudes.isna() | ~longitudes.between(-8.5, 2.5), "invalid longitude")
        invalid_speed = flag(speeds.isna() | ~speeds.between(0, 100), "invalid speed_limit")
        invalid_severity = flag(~frame["severity"].isin(CLASS_ORDER), "invalid severity")
        invalid_categories = flag(
            frame[["time_of_day", "day_of_week", "weather", "road_condition", "road_type", "vehicle_type", "lighting_condition"]]
            .eq("")
            .any(axis=1),
            "missing categorical value",
        )
        invalid_mask = (
            invalid_id
            | invalid_date
            | invalid_lat
            | invalid_lon
            | invalid_speed
            | invalid_severity
            | invalid_categories
        )

        valid = frame.loc[~invalid_mask].copy()
        valid["accident_date"] = dates.loc[valid.index].dt.strftime("%Y-%m-%d")
        valid["latitude"] = latitudes.loc[valid.index].astype(float)
        valid["longitude"] = longitudes.loc[valid.index].astype(float)
        valid["speed_limit"] = speeds.loc[valid.index].astype(int)
        valid = valid[DATASET_COLUMNS]

        duplicate_mask = valid.duplicated(subset=["accident_id"], keep="first")
        duplicate_rows = int(duplicate_mask.sum())
        valid = valid.loc[~duplicate_mask].copy()

        severity_counts = {
            label: int((valid["severity"] == label).sum()) for label in CLASS_ORDER
        }
        dates_valid = pd.to_datetime(valid["accident_date"], errors="coerce")
        report = {
            "file_name": filename,
            "size_bytes": len(content),
            "row_count": int(len(frame)),
            "valid_rows": int(len(valid)),
            "invalid_rows": int(invalid_mask.sum()),
            "duplicate_rows": duplicate_rows,
            "severity_counts": severity_counts,
            "date_range": {
                "start": dates_valid.min().date().isoformat() if not dates_valid.dropna().empty else None,
                "end": dates_valid.max().date().isoformat() if not dates_valid.dropna().empty else None,
            },
            "missing_columns": [],
            "extra_columns": extra,
            "invalid_reasons": {key: value for key, value in reasons.items() if value},
            "preview": json.loads(valid.head(5).to_json(orient="records", date_format="iso")),
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }
        if valid.empty:
            raise DatasetValidationError(
                "No valid rows were found. Review the invalid-row report and try again.", report
            )
        return valid, report

    def _safe_key(self, filename: str) -> str:
        base = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-") or "dataset.csv"
        return base[:120]

    def start_import(
        self,
        *,
        user_id: str,
        content: bytes,
        filename: str,
        valid: pd.DataFrame,
        report: dict,
    ) -> dict:
        upload_id = str(uuid.uuid4())
        storage_key = f"uploads/{user_id}/{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{self._safe_key(filename)}"
        storage_url = None
        storage_error = None
        if self.client.admin_configured:
            try:
                result = self.client.upload_storage(
                    "datasets",
                    storage_key,
                    content,
                    "text/csv",
                    admin=True,
                )
                storage_url = result.get("url") or f"/api/storage/buckets/datasets/objects/{storage_key}"
            except Exception as exc:
                storage_error = str(exc)
                logger.warning("Dataset file was not stored in InsForge storage: %s", exc)

        summary = dict(report)
        summary["storage_error"] = storage_error
        record = {
            "id": upload_id,
            "uploaded_by": user_id,
            "file_name": filename,
            "storage_key": storage_key if storage_url else None,
            "storage_url": storage_url,
            "row_count": report.get("row_count"),
            "valid_rows": report.get("valid_rows"),
            "invalid_rows": report.get("invalid_rows"),
            "status": "validated",
            "summary": summary,
        }
        self.client.insert_records("dataset_uploads", [record], admin=True)

        records = json.loads(valid.to_json(orient="records", date_format="iso"))
        return {
            "upload_id": upload_id,
            "status": "validated",
            "report": report,
            "storage": {"key": record["storage_key"], "url": storage_url},
            "records": records,
        }

    def import_records(self, upload_id: str, records: list[dict], report: dict) -> None:
        total = len(records)
        chunk_size = 500
        try:
            self.client.update_records(
                "dataset_uploads",
                {"id": f"eq.{upload_id}"},
                {"status": "validating"},
                admin=True,
            )
            imported = 0
            for start in range(0, total, chunk_size):
                chunk = records[start : start + chunk_size]
                self.client.insert_records("accident_records", chunk, admin=True, upsert=True)
                imported += len(chunk)
                if start % 5000 == 0:
                    summary = dict(report)
                    summary["imported_rows"] = imported
                    self.client.update_records(
                        "dataset_uploads",
                        {"id": f"eq.{upload_id}"},
                        {"status": "validating", "summary": summary},
                        admin=True,
                    )
            summary = dict(report)
            summary["imported_rows"] = imported
            self.client.update_records(
                "dataset_uploads",
                {"id": f"eq.{upload_id}"},
                {
                    "status": "imported",
                    "valid_rows": imported,
                    "summary": summary,
                },
                admin=True,
            )
            self.repository.refresh()
        except Exception as exc:
            logger.exception("Dataset import failed for upload %s", upload_id)
            try:
                self.client.update_records(
                    "dataset_uploads",
                    {"id": f"eq.{upload_id}"},
                    {"status": "failed", "error_message": str(exc)[:1000]},
                    admin=True,
                )
            except Exception:
                logger.exception("Could not update failed dataset import status")

    def list_uploads(self, limit: int = 50) -> list[dict]:
        if not self.client.admin_configured:
            return []
        return self.client.get_records(
            "dataset_uploads",
            params={"select": "*", "order": "created_at.desc", "limit": max(1, min(limit, 100))},
            admin=True,
        )

    def export_csv(
        self,
        *,
        severity: list[str] | None = None,
        road_type: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> str:
        frame = self.repository.get().copy()
        if severity:
            frame = frame[frame["severity"].isin(severity)]
        if road_type:
            frame = frame[frame["road_type"] == road_type]
        if date_from:
            frame = frame[frame["accident_date"] >= pd.to_datetime(date_from)]
        if date_to:
            frame = frame[frame["accident_date"] <= pd.to_datetime(date_to)]
        frame = frame.head(self.settings.max_export_rows)
        if "accident_date" in frame.columns:
            frame["accident_date"] = frame["accident_date"].dt.strftime("%Y-%m-%d")
        columns = [column for column in DATASET_COLUMNS if column in frame.columns]
        return frame[columns].to_csv(index=False)

    def template_csv(self) -> str:
        return pd.DataFrame([TEMPLATE_ROW], columns=DATASET_COLUMNS).to_csv(index=False)
