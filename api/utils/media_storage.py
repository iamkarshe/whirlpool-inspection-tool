"""Inspection media upload and URL resolution (local filesystem or S3)."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urljoin

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status

from mod.api.integration.helper import get_aws_s3_client_and_bucket
from utils.env import (
    get_media_base_url,
    get_media_presigned_url_ttl_seconds,
    get_media_type,
)

API_ROOT = Path(__file__).resolve().parents[1]
INSPECTION_MEDIA_CONTENT_TYPE = "image/jpeg"


def validate_media_relative_path(relative_path: str) -> Path:
    rel = Path(relative_path)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError("Invalid media path")
    parts = rel.parts
    if len(parts) < 1 or parts[0] != "uploads":
        raise ValueError("Media path must start with uploads/")
    return rel


def _local_upload(relative_path: str, data: bytes) -> str:
    rel = validate_media_relative_path(relative_path)
    dest = (API_ROOT / rel).resolve()
    uploads_root = (API_ROOT / "uploads").resolve()
    try:
        dest.relative_to(uploads_root)
    except ValueError as exc:
        raise ValueError("Media path must stay under uploads/") from exc
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return rel.as_posix()


def _s3_upload(relative_path: str, data: bytes) -> str:
    rel = validate_media_relative_path(relative_path)
    object_key = rel.as_posix()
    try:
        client, bucket_name = get_aws_s3_client_and_bucket()
        client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=data,
            ContentType=INSPECTION_MEDIA_CONTENT_TYPE,
        )
    except HTTPException:
        raise
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 upload failed: {exc.response.get('Error', {}).get('Message', str(exc))}",
        ) from exc
    except BotoCoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 upload failed: {exc}",
        ) from exc
    return object_key


def upload_media(relative_path: str, data: bytes) -> str:
    """Persist media and return the stored relative path (same key layout for local and S3)."""
    if get_media_type() == "s3":
        return _s3_upload(relative_path, data)
    return _local_upload(relative_path, data)


def _local_build_url(relative_path: str) -> str:
    base = (get_media_base_url() or "").strip()
    rel = relative_path if relative_path.startswith("/") else f"/{relative_path.lstrip('/')}"
    if not base:
        return rel
    return urljoin(base.rstrip("/") + "/", rel.lstrip("/"))


def _s3_build_url(relative_path: str) -> str:
    object_key = validate_media_relative_path(relative_path).as_posix()
    try:
        client, bucket_name = get_aws_s3_client_and_bucket()
        return client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket_name, "Key": object_key},
            ExpiresIn=get_media_presigned_url_ttl_seconds(),
        )
    except HTTPException:
        raise
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 pre-signed URL failed: {exc}",
        ) from exc


def build_url(relative_path: str | None) -> str:
    """Return an embeddable URL for a stored media path.

    Local: ``MEDIA_BASE_URL`` (or root-relative ``/uploads/...``).
    S3: pre-signed GET URL (default TTL 10 minutes).
    """
    if relative_path is None:
        return ""
    stored_path = str(relative_path).strip()
    if not stored_path:
        return ""
    if stored_path.startswith(("http://", "https://", "//")):
        return stored_path

    if get_media_type() == "s3":
        return _s3_build_url(stored_path)
    return _local_build_url(stored_path)
