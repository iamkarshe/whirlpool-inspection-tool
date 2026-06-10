import json
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Query

from mod.api.log.audit import ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED
from mod.api.login.response import (
    LoginDetailResponse,
    LoginInspectionResponse,
    LoginIpMetadataResponse,
    LoginListItemResponse,
)
from mod.model import Device, Inspection, IpAddressMetadata, Log, User


def parse_log_payload(raw_value: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_value) if raw_value else {}
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def parse_device_info(raw_value: str) -> Any:
    try:
        parsed = json.loads(raw_value) if raw_value else {}
        return parsed if isinstance(parsed, (dict, list)) else raw_value
    except json.JSONDecodeError:
        return raw_value or {}


def is_login_event_query(query: Query) -> Query:
    return query.filter(
        Log.is_active.is_(True),
        or_(
            Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
            Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
            Log.log_value.ilike('%"event": "login"%'),
            Log.log_value.ilike('%"event": "login_failed"%'),
        ),
    )


def apply_login_status_filter(query: Query, status: str | None) -> Query:
    if status == "successful":
        return query.filter(
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
                Log.log_value.ilike('%"event": "login"%'),
            )
        )
    if status == "failed":
        return query.filter(
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
            )
        )
    return query


def is_login_payload(payload: dict[str, Any]) -> bool:
    action = str(payload.get("action", "")).strip().lower()
    if action in {ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED}:
        return True
    event = str(payload.get("event", "")).strip().lower()
    return event in {"login", "login_failed"}


def is_successful_login_payload(payload: dict[str, Any]) -> bool:
    action = str(payload.get("action", "")).strip().lower()
    if action == ACTION_AUTH_LOGIN:
        return True
    event = str(payload.get("event", "")).strip().lower()
    return event == "login"


def resolve_status(payload: dict[str, Any]) -> str:
    action = str(payload.get("action", "")).strip().lower()
    if action == ACTION_AUTH_LOGIN_FAILED:
        return "failed"
    if action == ACTION_AUTH_LOGIN:
        return "successful"
    event = str(payload.get("event", "")).strip().lower()
    if event == "login_failed":
        return "failed"
    return "successful"


def resolve_attempted_email(payload: dict[str, Any], user: User | None) -> str | None:
    for key in ("attempted_email", "login_email", "email"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    if user is not None and user.email:
        return user.email
    return None


def resolve_failure_reason(payload: dict[str, Any]) -> str | None:
    if resolve_status(payload) != "failed":
        return None
    reason = payload.get("reason") or payload.get("message")
    if isinstance(reason, str) and reason.strip():
        return reason.strip()
    return None


def resolve_device_source(
    payload: dict[str, Any], device: Device | None, default: str = "N/A"
) -> str:
    user_agent = payload.get("user_agent")
    if isinstance(user_agent, str) and user_agent.strip():
        return user_agent.strip()

    if device is None:
        return default

    if device.device_info:
        return str(device.device_info)

    return default


def map_ip_metadata(
    metadata: IpAddressMetadata | None,
) -> LoginIpMetadataResponse | None:
    if metadata is None:
        return None
    status = metadata.lookup_status.value if hasattr(metadata.lookup_status, "value") else str(metadata.lookup_status)
    return LoginIpMetadataResponse(
        country_code=metadata.country_code,
        country_name=metadata.country_name,
        region=metadata.region,
        city=metadata.city,
        isp=metadata.isp,
        lookup_status=status,
    )


def build_reference_id(log_id: int) -> str:
    return f"log-{log_id:03d}"


def map_login_list_item(
    log: Log,
    user: User | None,
    device: Device | None,
    ip_metadata: IpAddressMetadata | None = None,
) -> LoginListItemResponse:
    payload = parse_log_payload(log.log_value)
    attempted_email = resolve_attempted_email(payload, user)
    return LoginListItemResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else attempted_email,
        attempted_email=attempted_email,
        login_method=payload.get("login_method"),
        failure_reason=resolve_failure_reason(payload),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        proxy_ip_address=payload.get("proxy_ip"),
        ip_metadata=map_ip_metadata(ip_metadata),
        device_source=resolve_device_source(payload=payload, device=device),
        status=resolve_status(payload),
    )


def map_login_detail(
    log: Log,
    user: User | None,
    device: Device | None,
    ip_metadata: IpAddressMetadata | None = None,
) -> LoginDetailResponse:
    payload = parse_log_payload(log.log_value)
    attempted_email = resolve_attempted_email(payload, user)
    return LoginDetailResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else attempted_email,
        attempted_email=attempted_email,
        login_method=payload.get("login_method"),
        failure_reason=resolve_failure_reason(payload),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        proxy_ip_address=payload.get("proxy_ip"),
        ip_metadata=map_ip_metadata(ip_metadata),
        device_source=resolve_device_source(payload=payload, device=device),
        user_agent=payload.get("user_agent"),
        status=resolve_status(payload),
        device_info=parse_device_info(device.device_info) if device else {},
        inspections_done=0,
        inspections=[],
    )


def map_login_inspection(inspection: Inspection) -> LoginInspectionResponse:
    return LoginInspectionResponse(
        id=inspection.id,
        uuid=inspection.uuid,
        inspection_type=inspection.inspection_type.value
        if hasattr(inspection.inspection_type, "value")
        else str(inspection.inspection_type),
        product_id=inspection.product_id,
        created_at=inspection.created_at,
    )
