"""
Runtime configuration. All values come from env vars; in Cloud Run they're
bound from Google Secret Manager via --set-secrets.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Required
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    R2_ACCOUNT_ID: str
    R2_BUCKET: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    PROCESSOR_SECRET: str

    # Tunables
    DEFAULT_MODEL: str = "claude-haiku-4-5-20251001"
    HIGH_QUALITY_MODEL: str = "claude-sonnet-4-6"
    MAX_IMAGE_LONGEST_SIDE: int = 1568


settings = Settings()  # type: ignore[call-arg]
