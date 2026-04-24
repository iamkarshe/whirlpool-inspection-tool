import json
from typing import Any

from mod.api.login.response import (
    LoginDetailResponse,
    LoginInspectionResponse,
    LoginListItemResponse,
)
from mod.model import Device, Inspection, Log, User


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


def resolve_status(payload: dict[str, Any]) -> str:
    event = str(payload.get("event", "")).strip().lower()
    if event == "login_failed":
        return "failed"
    return "successful"


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


def build_reference_id(log_id: int) -> str:
    return f"log-{log_id:03d}"


def map_login_list_item(log: Log, user: User | None, device: Device | None) -> LoginListItemResponse:
    payload = parse_log_payload(log.log_value)
    return LoginListItemResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else payload.get("email"),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        device_source=resolve_device_source(payload=payload, device=device),
        status=resolve_status(payload),
    )


def map_login_detail(log: Log, user: User | None, device: Device | None) -> LoginDetailResponse:
    payload = parse_log_payload(log.log_value)
    return LoginDetailResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else payload.get("email"),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        proxy_ip_address=payload.get("proxy_ip"),
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
        checklist_id=inspection.checklist_id,
        created_at=inspection.created_at,
    )
