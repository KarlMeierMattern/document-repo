"""R2 download helper (S3-compatible)."""

from __future__ import annotations

import boto3
from botocore.client import Config

from settings import settings

_client = None


def _r2():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
    return _client


def download_bytes(key: str) -> bytes:
    """Fetch the full object body. Raises on 404."""
    obj = _r2().get_object(Bucket=settings.R2_BUCKET, Key=key)
    return obj["Body"].read()
