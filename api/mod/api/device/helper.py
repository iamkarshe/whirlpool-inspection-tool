import json
from typing import Any

from mod.api.device.response import DeviceResponse
from mod.model import Device


def safe_device_info(raw_device_info: str) -> Any:
    try:
        return json.loads(raw_device_info) if raw_device_info else {}
    except json.JSONDecodeError:
        return {"raw": raw_device_info}


def map_device(device: Device) -> DeviceResponse:
    return DeviceResponse(
        id=device.id,
        uuid=device.uuid,
        user_id=device.user_id,
        user_name=device.user.name if device.user else "",
        imei=device.imei,
        device_type=device.device_type.value
        if hasattr(device.device_type, "value")
        else str(device.device_type),
        device_fingerprint=device.device_fingerprint,
        device_info=safe_device_info(device.device_info),
        ip_address=str(device.ip_address) if device.ip_address is not None else None,
        proxy_ip_address=str(device.proxy_ip_address)
        if device.proxy_ip_address is not None
        else None,
        current_lat=device.current_lat,
        current_lng=device.current_lng,
        is_locked=bool(device.is_locked),
        is_active=bool(device.is_active),
        created_at=device.created_at,
        updated_at=device.updated_at,
    )
