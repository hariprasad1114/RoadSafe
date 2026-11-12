from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime, timezone

from app.core.config import Settings
from app.services.insforge import InsForgeClient

logger = logging.getLogger(__name__)

PRIORITY_SCORE = {"critical": 4, "high": 3, "medium": 2, "low": 1}
CATEGORY_LABELS = {
    "engineering": "Engineering",
    "enforcement": "Enforcement",
    "education": "Education",
    "emergency": "Emergency response",
    "data": "Data and evaluation",
}


class RecommendationService:
    def __init__(self, settings: Settings, client: InsForgeClient) -> None:
        self.settings = settings
        self.client = client
        self._lock = threading.Lock()
        self._cache: tuple[float, list[dict]] | None = None
        self.ttl = settings.data_cache_ttl_seconds
        self._fallback_path = settings.data_path / "recommendations.json"

    def _fallback(self) -> list[dict]:
        if not self._fallback_path.exists():
            return []
        return json.loads(self._fallback_path.read_text(encoding="utf-8"))

    def _load(self) -> list[dict]:
        with self._lock:
            if self._cache and (time.time() - self._cache[0]) < self.ttl:
                return self._cache[1]
        items: list[dict] = []
        if self.client.configured:
            try:
                records = self.client.get_records(
                    "recommendations",
                    params={"select": "*", "is_active": "eq.true", "order": "sort_order.asc"},
                )
                if records:
                    items = records
            except Exception as exc:
                logger.warning("Could not load recommendations from InsForge: %s", exc)
        if not items:
            items = self._fallback()
        items = sorted(items, key=lambda item: (_int(item.get("sort_order")), -PRIORITY_SCORE.get(item.get("priority", "low"), 1)))
        with self._lock:
            self._cache = (time.time(), items)
        return items

    def list(self, category: str | None = None, priority: str | None = None, road_type: str | None = None) -> dict:
        items = self._load()
        if category:
            items = [item for item in items if item.get("category") == category]
        if priority:
            items = [item for item in items if item.get("priority") == priority]
        if road_type:
            items = [item for item in items if not item.get("road_type") or item.get("road_type") == road_type]
        return {
            "count": len(items),
            "categories": CATEGORY_LABELS,
            "recommendations": items,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def for_context(self, road_type: str | None, weather: str | None, limit: int = 3) -> list[dict]:
        items = self._load()
        scored: list[tuple[int, dict]] = []
        for item in items:
            score = PRIORITY_SCORE.get(item.get("priority", "low"), 1)
            if item.get("road_type") and item.get("road_type") == road_type:
                score += 5
            if item.get("weather") and item.get("weather") == weather:
                score += 4
            if not item.get("road_type") and not item.get("weather"):
                score += 1
            scored.append((score, item))
        scored.sort(key=lambda pair: (pair[0], -_int(pair[1].get("sort_order"))), reverse=True)
        selected = []
        for _, item in scored[: max(1, limit)]:
            selected.append(
                {
                    "slug": item.get("slug"),
                    "title": item.get("title"),
                    "category": item.get("category"),
                    "priority": item.get("priority"),
                    "summary": item.get("summary"),
                    "impact_estimate": item.get("impact_estimate"),
                }
            )
        return selected

    def count(self) -> int:
        return len(self._load())


def _int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
