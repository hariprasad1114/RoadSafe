from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "RoadSafe AI ML API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"

    insforge_url: str = ""
    insforge_anon_key: str = ""
    insforge_api_key: str = ""

    model_dir: str = "models"
    data_dir: str = "data"
    bundle_dataset_path: str = "data/accidents_uk_2022.csv"

    data_cache_ttl_seconds: int = 600
    warm_dataset_cache: bool = True
    max_dbscan_points: int = 20000
    max_export_rows: int = 25000
    rate_limit_per_minute: int = 180
    request_timeout_seconds: float = 30.0
    max_upload_mb: int = 30

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def _resolve(self, value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else (BACKEND_ROOT / path).resolve()

    @property
    def model_path(self) -> Path:
        return self._resolve(self.model_dir)

    @property
    def data_path(self) -> Path:
        return self._resolve(self.data_dir)

    @property
    def bundle_dataset(self) -> Path:
        return self._resolve(self.bundle_dataset_path)

    @property
    def insforge_configured(self) -> bool:
        return bool(self.insforge_url and self.insforge_anon_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
