"""IP address metadata cache and async geo lookup scheduling."""

from __future__ import annotations

import ipaddress
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from mod.model import IpAddressMetadata, IpLookupStatus


def normalize_ip_address(ip_address: str | None) -> str | None:
    if ip_address is None:
        return None
    value = str(ip_address).strip()
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return value


def is_private_or_local_ip(ip_address: str) -> bool:
    try:
        parsed = ipaddress.ip_address(ip_address)
    except ValueError:
        return False
    return bool(
        parsed.is_private
        or parsed.is_loopback
        or parsed.is_link_local
        or parsed.is_reserved
    )


def get_ip_metadata_by_addresses(
    db: Session, ip_addresses: list[str]
) -> dict[str, IpAddressMetadata]:
    normalized = [
        value
        for value in dict.fromkeys(
            filter(None, (normalize_ip_address(ip) for ip in ip_addresses))
        )
    ]
    if not normalized:
        return {}
    rows = (
        db.query(IpAddressMetadata)
        .filter(IpAddressMetadata.ip_address.in_(normalized))
        .all()
    )
    return {str(row.ip_address): row for row in rows}


def get_or_create_ip_metadata(db: Session, ip_address: str) -> IpAddressMetadata:
    normalized = normalize_ip_address(ip_address)
    if normalized is None:
        raise ValueError("ip_address is required")
    row = (
        db.query(IpAddressMetadata)
        .filter(IpAddressMetadata.ip_address == normalized)
        .first()
    )
    if row is not None:
        return row
    row = IpAddressMetadata(ip_address=normalized)
    db.add(row)
    db.flush()
    return row


def mark_ip_metadata_skipped(db: Session, ip_address: str) -> IpAddressMetadata:
    row = get_or_create_ip_metadata(db, ip_address)
    row.lookup_status = IpLookupStatus.skipped
    row.lookup_error = None
    row.looked_up_at = datetime.now(timezone.utc)
    return row


def enqueue_ip_metadata_lookup_task(
    db: Session,
    ip_address: str,
    *,
    created_by: str,
) -> uuid.UUID | None:
    from mod.tasks.queue import try_enqueue_background_task

    normalized = normalize_ip_address(ip_address)
    if normalized is None:
        return None
    if is_private_or_local_ip(normalized):
        mark_ip_metadata_skipped(db, normalized)
        return None

    row = get_or_create_ip_metadata(db, normalized)
    if row.lookup_status == IpLookupStatus.completed:
        return None

    task_uuid = try_enqueue_background_task(
        db,
        task_type="resolve_ip_metadata",
        payload={"ip_address": normalized},
        created_by=created_by,
    )
    if task_uuid is None:
        return None
    row.lookup_status = IpLookupStatus.pending
    return task_uuid


def schedule_ip_metadata_lookup(db: Session, ip_address: str | None) -> None:
    normalized = normalize_ip_address(ip_address)
    if normalized is None:
        return
    enqueue_ip_metadata_lookup_task(db, normalized, created_by="auth")


def seed_ips_from_auth_login_logs(db: Session, *, limit: int) -> int:
    from sqlalchemy import or_

    from mod.api.log.audit import ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED
    from mod.api.login.helper import parse_log_payload
    from mod.model import Log

    rows = (
        db.query(Log.log_value)
        .filter(
            Log.is_active.is_(True),
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
                Log.log_value.ilike('%"event": "login"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
            ),
        )
        .order_by(Log.created_at.desc())
        .limit(max(limit * 10, limit))
        .all()
    )

    seeded = 0
    seen: set[str] = set()
    for (log_value,) in rows:
        payload = parse_log_payload(log_value)
        ip_value = payload.get("ip")
        normalized = normalize_ip_address(ip_value if isinstance(ip_value, str) else None)
        if normalized is None or normalized in seen:
            continue
        seen.add(normalized)
        if is_private_or_local_ip(normalized):
            mark_ip_metadata_skipped(db, normalized)
            continue
        row = get_or_create_ip_metadata(db, normalized)
        if row.lookup_status == IpLookupStatus.completed:
            continue
        seeded += 1
        if seeded >= limit:
            break
    db.flush()
    return seeded


def enqueue_unresolved_ip_metadata_lookups(db: Session, *, limit: int) -> dict[str, Any]:
    rows = (
        db.query(IpAddressMetadata)
        .filter(
            IpAddressMetadata.lookup_status.in_(
                [IpLookupStatus.pending, IpLookupStatus.failed]
            )
        )
        .order_by(IpAddressMetadata.updated_at.asc())
        .limit(limit)
        .all()
    )

    enqueued = 0
    skipped = 0
    failures: list[dict[str, str]] = []
    for row in rows:
        ip_address = str(row.ip_address)
        if is_private_or_local_ip(ip_address):
            mark_ip_metadata_skipped(db, ip_address)
            skipped += 1
            continue
        try:
            task_uuid = enqueue_ip_metadata_lookup_task(
                db,
                ip_address,
                created_by="resolve_pending_ip_metadata",
            )
            if task_uuid is None:
                if not ip_geo_lookup_enabled():
                    failures.append(
                        {
                            "ip_address": ip_address,
                            "error": "IP geolocation lookup is disabled",
                        }
                    )
                else:
                    from utils.env import is_celery_broker_configured

                    if not is_celery_broker_configured():
                        failures.append(
                            {
                                "ip_address": ip_address,
                                "error": "Redis/Celery broker is not configured",
                            }
                        )
            else:
                enqueued += 1
        except Exception as exc:
            failures.append({"ip_address": ip_address, "error": str(exc)})

    db.commit()
    return {
        "candidates": len(rows),
        "enqueued": enqueued,
        "skipped": skipped,
        "failures": failures,
    }


def ip_geo_lookup_enabled() -> bool:
    from mod.tasks.ip_geo import ip_geo_lookup_enabled as lookup_enabled

    return lookup_enabled()


def apply_ip_geo_lookup_result(
    db: Session,
    *,
    ip_address: str,
    lookup_source: str,
    country_code: str | None,
    country_name: str | None,
    region: str | None,
    city: str | None,
    isp: str | None,
    raw_response: dict[str, Any] | None,
) -> IpAddressMetadata:
    row = get_or_create_ip_metadata(db, ip_address)
    row.lookup_status = IpLookupStatus.completed
    row.lookup_source = lookup_source
    row.lookup_error = None
    row.country_code = country_code
    row.country_name = country_name
    row.region = region
    row.city = city
    row.isp = isp
    row.raw_response = raw_response
    row.looked_up_at = datetime.now(timezone.utc)
    return row


def mark_ip_metadata_lookup_failed(
    db: Session,
    *,
    ip_address: str,
    lookup_source: str,
    error_message: str,
    raw_response: dict[str, Any] | None = None,
) -> IpAddressMetadata:
    row = get_or_create_ip_metadata(db, ip_address)
    row.lookup_status = IpLookupStatus.failed
    row.lookup_source = lookup_source
    row.lookup_error = error_message[:2000]
    row.raw_response = raw_response
    row.looked_up_at = datetime.now(timezone.utc)
    return row
