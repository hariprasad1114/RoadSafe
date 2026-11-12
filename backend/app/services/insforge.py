from __future__ import annotations

import json
import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Iterator

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


class InsForgeError(RuntimeError):
    pass


class InsForgeClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = settings.insforge_url.rstrip("/")
        self.anon_key = settings.insforge_anon_key
        self.api_key = settings.insforge_api_key
        self._client = httpx.Client(
            timeout=settings.request_timeout_seconds,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            headers={"User-Agent": "RoadSafeAI/1.0"},
        )

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.anon_key)

    @property
    def admin_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def close(self) -> None:
        self._client.close()

    def _headers(self, token: str | None = None, admin: bool = False) -> dict[str, str]:
        key = self.api_key if admin else (token or self.anon_key)
        if not key:
            raise InsForgeError("InsForge credentials are not configured")
        return {"Authorization": f"Bearer {key}"}

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        token: str | None = None,
        admin: bool = False,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
        attempts: int = 3,
    ) -> httpx.Response:
        if not self.base_url:
            raise InsForgeError("INSFORGE_URL is not configured")
        url = f"{self.base_url}{path}"
        request_headers = self._headers(token=token, admin=admin)
        if headers:
            request_headers.update(headers)
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                response = self._client.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=request_headers,
                    timeout=timeout or self.settings.request_timeout_seconds,
                )
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt < attempts - 1:
                    time.sleep(min(2**attempt, 10))
                    continue
                raise InsForgeError(f"InsForge request failed: {exc}") from exc

            if response.status_code in (429, 500, 502, 503, 504) and attempt < attempts - 1:
                time.sleep(min(2**attempt, 10))
                continue
            if response.status_code >= 400:
                raise InsForgeError(
                    f"InsForge {method} {path} failed ({response.status_code}): {response.text[:500]}"
                )
            return response
        raise InsForgeError(f"InsForge request failed: {last_error}")

    def get_records(
        self,
        table: str,
        *,
        params: dict[str, Any] | None = None,
        token: str | None = None,
        admin: bool = False,
    ) -> list[dict[str, Any]]:
        response = self.request(
            "GET",
            f"/api/database/records/{table}",
            params=params or {},
            token=token,
            admin=admin,
        )
        payload = response.json()
        return payload if isinstance(payload, list) else []

    def count_records(
        self,
        table: str,
        *,
        params: dict[str, Any] | None = None,
        token: str | None = None,
        admin: bool = False,
    ) -> int | None:
        merged = dict(params or {})
        merged.update({"select": "*", "limit": 1})
        response = self.request(
            "GET",
            f"/api/database/records/{table}",
            params=merged,
            token=token,
            admin=admin,
            headers={"Prefer": "count=exact"},
        )
        total = response.headers.get("X-Total-Count")
        if total and total.isdigit():
            return int(total)
        content_range = response.headers.get("Content-Range", "")
        if "/" in content_range:
            tail = content_range.rsplit("/", 1)[-1]
            if tail.isdigit():
                return int(tail)
        return None

    def fetch_all(
        self,
        table: str,
        *,
        select: str = "*",
        order: str = "accident_id.asc",
        page_size: int = 1000,
        max_rows: int | None = None,
        token: str | None = None,
        admin: bool = False,
    ) -> list[dict[str, Any]]:
        page_size = max(1, min(page_size, 1000))
        total = self.count_records(table, token=token, admin=admin)
        if total == 0:
            return []
        if total is None:
            rows: list[dict[str, Any]] = []
            offset = 0
            while True:
                page = self.get_records(
                    table,
                    params={"select": select, "order": order, "limit": page_size, "offset": offset},
                    token=token,
                    admin=admin,
                )
                if not page:
                    break
                rows.extend(page)
                if max_rows and len(rows) >= max_rows:
                    break
                if len(page) < page_size:
                    break
                offset += page_size
            return rows[:max_rows] if max_rows else rows

        if max_rows:
            total = min(total, max_rows)
        pages = math.ceil(total / page_size)

        def fetch_page(page_index: int) -> list[dict[str, Any]]:
            offset = page_index * page_size
            limit = min(page_size, total - offset)
            if limit <= 0:
                return []
            return self.get_records(
                table,
                params={"select": select, "order": order, "limit": limit, "offset": offset},
                token=token,
                admin=admin,
            )

        rows: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=min(8, max(1, pages))) as executor:
            for page in executor.map(fetch_page, range(pages)):
                rows.extend(page)
        return rows[:total]

    def iter_csv_pages(
        self,
        table: str,
        *,
        select: str = "*",
        order: str = "accident_id.asc",
        page_size: int = 1000,
        max_rows: int | None = None,
        token: str | None = None,
        admin: bool = False,
    ) -> Iterator[str]:
        """Yield CSV chunks instead of building one large list of row dicts."""
        page_size = max(1, min(page_size, 1000))
        total = self.count_records(table, token=token, admin=admin)
        if not total:
            return
        if max_rows:
            total = min(total, max_rows)
        pages = math.ceil(total / page_size)

        def fetch_page(page_index: int) -> str:
            offset = page_index * page_size
            limit = min(page_size, total - offset)
            if limit <= 0:
                return ""
            response = self.request(
                "GET",
                f"/api/database/records/{table}",
                params={"select": select, "order": order, "limit": limit, "offset": offset},
                token=token,
                admin=admin,
                headers={"Accept": "text/csv"},
            )
            content_type = response.headers.get("Content-Type", "")
            if "csv" not in content_type.lower():
                raise InsForgeError(
                    f"InsForge did not return CSV for {table} (Content-Type: {content_type})"
                )
            text = response.text
            # The InsForge gateway wraps CSV bodies in a JSON string.
            if text.startswith('"'):
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, str):
                    return parsed
            return text

        with ThreadPoolExecutor(max_workers=min(8, max(1, pages))) as executor:
            for csv_page in executor.map(fetch_page, range(pages)):
                if csv_page:
                    yield csv_page

    def insert_records(
        self,
        table: str,
        records: list[dict[str, Any]],
        *,
        token: str | None = None,
        admin: bool = False,
        upsert: bool = False,
    ) -> None:
        prefer = "resolution=merge-duplicates,return=minimal" if upsert else "return=minimal"
        self.request(
            "POST",
            f"/api/database/records/{table}",
            json=records,
            token=token,
            admin=admin,
            headers={"Prefer": prefer, "Content-Type": "application/json"},
        )

    def update_records(
        self,
        table: str,
        filters: dict[str, str],
        values: dict[str, Any],
        *,
        token: str | None = None,
        admin: bool = False,
    ) -> None:
        self.request(
            "PATCH",
            f"/api/database/records/{table}",
            params=filters,
            json=values,
            token=token,
            admin=admin,
            headers={"Prefer": "return=minimal", "Content-Type": "application/json"},
        )

    def delete_records(
        self,
        table: str,
        filters: dict[str, str],
        *,
        token: str | None = None,
        admin: bool = False,
    ) -> None:
        self.request(
            "DELETE",
            f"/api/database/records/{table}",
            params=filters,
            token=token,
            admin=admin,
            headers={"Prefer": "return=minimal"},
        )

    def current_user(self, token: str) -> dict[str, Any] | None:
        try:
            response = self.request("GET", "/api/auth/sessions/current", token=token, attempts=1)
        except InsForgeError:
            return None
        payload = response.json()
        return payload.get("user") if isinstance(payload, dict) else None

    def get_profile(self, user_id: str, *, token: str | None = None) -> dict[str, Any] | None:
        records = self.get_records(
            "profiles",
            params={"select": "id,email,full_name,role,organisation", "id": f"eq.{user_id}", "limit": 1},
            token=token,
            admin=token is None,
        )
        return records[0] if records else None

    def upload_storage(
        self,
        bucket: str,
        key: str,
        content: bytes,
        content_type: str = "text/csv",
        *,
        token: str | None = None,
        admin: bool = False,
    ) -> dict[str, Any]:
        return self._upload_storage(bucket, key, content, content_type, token, admin)

    def _upload_storage(
        self,
        bucket: str,
        key: str,
        content: bytes,
        content_type: str,
        token: str | None,
        admin: bool,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/storage/buckets/{bucket}/objects/{key}"
        headers = self._headers(token=token, admin=admin)
        response = self._client.put(
            url,
            headers=headers,
            files={"file": (key.rsplit("/", 1)[-1], content, content_type)},
            timeout=120,
        )
        if response.status_code >= 400:
            raise InsForgeError(
                f"Storage upload failed ({response.status_code}): {response.text[:500]}"
            )
        payload = response.json()
        return payload if isinstance(payload, dict) else {}
