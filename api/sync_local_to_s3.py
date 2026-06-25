#!/usr/bin/env python3
"""Mirror local uploads/ to the configured AWS S3 bucket.

Local ``uploads/`` is the source of truth: files are uploaded under the
``uploads/`` object-key prefix (matching ``utils.media_storage``), and S3
objects under that prefix that no longer exist locally are removed.

Usage:
  python3 sync_local_to_s3.py
  python3 sync_local_to_s3.py --dry-run
  python3 sync_local_to_s3.py --no-delete
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import mimetypes
from collections.abc import Iterator
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from mod.api.integration.helper import resolve_aws_s3_credentials

API_ROOT = Path(__file__).resolve().parent
UPLOADS_DIR = API_ROOT / "uploads"
S3_PREFIX = "uploads/"
SKIP_FILENAMES = frozenset({".gitkeep", ".gitignore"})

logger = logging.getLogger(__name__)


def iter_local_uploads() -> Iterator[tuple[str, Path]]:
    if not UPLOADS_DIR.is_dir():
        return

    for path in sorted(UPLOADS_DIR.rglob("*")):
        if not path.is_file() or path.name in SKIP_FILENAMES:
            continue
        relative = path.relative_to(UPLOADS_DIR).as_posix()
        yield f"{S3_PREFIX}{relative}", path


def file_md5(path: Path) -> str:
    digest = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def object_matches_local(client, bucket: str, key: str, local_path: Path) -> bool:
    try:
        response = client.head_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"404", "NoSuchKey", "NotFound"}:
            return False
        raise

    local_size = local_path.stat().st_size
    remote_size = response.get("ContentLength")
    if remote_size != local_size:
        return False

    etag = str(response.get("ETag", "")).strip('"')
    if "-" in etag:
        # Multipart upload ETag is not a plain MD5; size match is enough here.
        return True

    return etag == file_md5(local_path)


def guess_content_type(path: Path) -> str:
    content_type, _ = mimetypes.guess_type(path.name)
    return content_type or "application/octet-stream"


def list_remote_keys(client, bucket: str, prefix: str) -> set[str]:
    keys: set[str] = set()
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents") or []:
            key = item["Key"]
            if not key.endswith("/"):
                keys.add(key)
    return keys


def build_s3_client(credentials: dict[str, str]):
    return boto3.client(
        "s3",
        region_name=credentials["region"],
        aws_access_key_id=credentials["access_key_id"],
        aws_secret_access_key=credentials["secret_access_key"],
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Mirror local uploads/ to the configured AWS S3 bucket.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned uploads/deletes without changing S3.",
    )
    parser.add_argument(
        "--no-delete",
        action="store_true",
        help="Upload new/changed files but do not remove stale S3 objects.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    credentials = resolve_aws_s3_credentials(None)
    missing_fields = [field for field, value in credentials.items() if not value]
    if missing_fields:
        logger.error(
            "AWS S3 is not configured: missing %s",
            ", ".join(missing_fields),
        )
        return 1

    bucket = credentials["bucket_name"]
    try:
        client = build_s3_client(credentials)
    except BotoCoreError as exc:
        logger.error("Failed to create S3 client: %s", exc)
        return 1

    local_files = dict(iter_local_uploads())
    uploaded = 0
    skipped = 0

    for key, local_path in local_files.items():
        try:
            if object_matches_local(client, bucket, key, local_path):
                skipped += 1
                continue
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to inspect %s: %s", key, exc)
            return 1

        if args.dry_run:
            logger.info("[dry-run] upload %s", key)
        else:
            try:
                client.upload_file(
                    str(local_path),
                    bucket,
                    key,
                    ExtraArgs={"ContentType": guess_content_type(local_path)},
                )
                logger.info("uploaded %s", key)
            except (ClientError, BotoCoreError) as exc:
                logger.error("Failed to upload %s: %s", key, exc)
                return 1
        uploaded += 1

    deleted = 0
    if not args.no_delete:
        try:
            remote_keys = list_remote_keys(client, bucket, S3_PREFIX)
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to list remote objects: %s", exc)
            return 1

        stale_keys = sorted(remote_keys - set(local_files.keys()))
        for key in stale_keys:
            if args.dry_run:
                logger.info("[dry-run] delete %s", key)
            else:
                try:
                    client.delete_object(Bucket=bucket, Key=key)
                    logger.info("deleted %s", key)
                except (ClientError, BotoCoreError) as exc:
                    logger.error("Failed to delete %s: %s", key, exc)
                    return 1
            deleted += 1

    logger.info(
        "sync complete: uploaded=%s skipped=%s deleted=%s dry_run=%s",
        uploaded,
        skipped,
        deleted,
        args.dry_run,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
