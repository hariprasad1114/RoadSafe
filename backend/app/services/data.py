from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

import pandas as pd

from app.core.config import Settings
from app.ml.features import CLASS_ORDER, TARGET
from app.services.insforge import InsForgeClient

logger = logging.getLogger(__name__)

DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TIME_ORDER = ["Morning", "Afternoon", "Evening", "Night", "Other"]


class DataUnavailableError(RuntimeError):
    pass


class DataRepository:
    def __init__(self, settings: Settings, client: InsForgeClient) -> None:
        self.settings = settings
        self.client = client
        self._lock = threading.Lock()
        self._frame: pd.DataFrame | None = None
        self._fetched_at: float = 0.0
        self.source = "unloaded"
        self.last_error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._frame is not None

    def _normalize(self, frame: pd.DataFrame) -> pd.DataFrame:
        frame = frame.copy()
        for column in [
            "accident_id",
            "time_of_day",
            "day_of_week",
            "weather",
            "road_condition",
            "road_type",
            "vehicle_type",
            "lighting_condition",
            "severity",
            "source_dataset",
        ]:
            if column in frame.columns:
                frame[column] = frame[column].fillna("Other").astype(str).str.strip()
        if "accident_date" in frame.columns:
            frame["accident_date"] = pd.to_datetime(frame["accident_date"], errors="coerce")
        else:
            frame["accident_date"] = pd.NaT
        for column in ["latitude", "longitude", "speed_limit"]:
            if column in frame.columns:
                frame[column] = pd.to_numeric(frame[column], errors="coerce")
        frame = frame.dropna(subset=["latitude", "longitude"])
        frame["speed_limit"] = frame["speed_limit"].fillna(0).astype(int)
        frame = frame[frame[TARGET].isin(CLASS_ORDER)]
        frame["is_severe"] = frame[TARGET].isin(["Serious", "Fatal"])
        frame["is_fatal"] = frame[TARGET].eq("Fatal")
        frame["month"] = frame["accident_date"].dt.to_period("M").astype(str)
        frame["year"] = frame["accident_date"].dt.year
        return frame.reset_index(drop=True)

    def _load_bundled(self) -> pd.DataFrame:
        path = self.settings.bundle_dataset
        if not path.exists():
            raise DataUnavailableError(f"Bundled dataset not found at {path}")
        frame = pd.read_csv(path, low_memory=False)
        self.source = "bundled"
        return self._normalize(frame)

    def _load_remote(self) -> pd.DataFrame:
        rows = self.client.fetch_all(
            "accident_records",
            select="*",
            order="accident_id.asc",
            page_size=1000,
            max_rows=250000,
            admin=False,
        )
        if not rows:
            raise DataUnavailableError("InsForge returned no accident records")
        frame = self._normalize(pd.DataFrame(rows))
        if frame.empty:
            raise DataUnavailableError("InsForge accident records were empty after validation")
        self.source = "insforge"
        return frame

    def get(self) -> pd.DataFrame:
        ttl = self.settings.data_cache_ttl_seconds
        with self._lock:
            if self._frame is not None and (time.time() - self._fetched_at) < ttl:
                return self._frame

            frame: pd.DataFrame | None = None
            if self.client.configured:
                try:
                    frame = self._load_remote()
                except Exception as exc:
                    self.last_error = str(exc)
                    logger.warning("Falling back to bundled accident data: %s", exc)
            if frame is None:
                frame = self._load_bundled()
            self._frame = frame
            self._fetched_at = time.time()
            self.last_error = None
            return frame

    def refresh(self) -> pd.DataFrame:
        with self._lock:
            self._fetched_at = 0.0
        return self.get()

    def status(self) -> dict:
        return {
            "source": self.source,
            "loaded": self.is_loaded,
            "rows": int(len(self._frame)) if self._frame is not None else 0,
            "fetched_at": (
                datetime.fromtimestamp(self._fetched_at, tz=timezone.utc).isoformat()
                if self._fetched_at
                else None
            ),
            "last_error": self.last_error,
        }
