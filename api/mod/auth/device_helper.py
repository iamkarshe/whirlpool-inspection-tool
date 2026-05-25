import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from mod.auth.response import ActiveDeviceResponse
from mod.model import Device, UserSession


def device_display_label(device: Device) -> str:
    raw = (device.device_info or "").strip()
    if not raw:
        return device.device_fingerprint[:48]
    try:
        info = json.loads(raw)
        if isinstance(info, dict):
            ua = info.get("userAgent") or info.get("user_agent")
            platform = info.get("platform")
            if ua and platform:
                return f"{platform} — {str(ua)[:80]}"
            if ua:
                return str(ua)[:120]
            if platform:
                return str(platform)
    except (json.JSONDecodeError, TypeError):
        pass
    return device.device_fingerprint[:48]


def map_active_device(
    device: Device,
    *,
    is_current: bool = False,
    has_active_session: bool = False,
) -> ActiveDeviceResponse:
    device_type = (
        device.device_type.value
        if hasattr(device.device_type, "value")
        else str(device.device_type)
    )
    return ActiveDeviceResponse(
        uuid=device.uuid,
        imei=device.imei,
        device_type=device_type,
        device_fingerprint=device.device_fingerprint,
        display_label=device_display_label(device),
        is_current=is_current,
        has_active_session=has_active_session,
        last_seen_at=device.updated_at,
    )


def device_ids_with_active_sessions(db: Session, user_id: int) -> set[int]:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(UserSession.device_id)
        .filter(
            UserSession.user_id == user_id,
            UserSession.is_active.is_(True),
            UserSession.expires_at > now,
            UserSession.device_id.isnot(None),
        )
        .distinct()
        .all()
    )
    return {row[0] for row in rows if row[0] is not None}


def list_active_devices_for_user(
    db: Session,
    user_id: int,
    *,
    current_device_uuid: uuid.UUID | None = None,
) -> list[ActiveDeviceResponse]:
    session_device_ids = device_ids_with_active_sessions(db, user_id)
    devices = (
        db.query(Device)
        .filter(
            Device.user_id == user_id,
            Device.is_active.is_(True),
        )
        .order_by(Device.updated_at.desc())
        .all()
    )
    return [
        map_active_device(
            device,
            is_current=current_device_uuid is not None
            and device.uuid == current_device_uuid,
            has_active_session=device.id in session_device_ids,
        )
        for device in devices
    ]


def count_other_active_devices(
    db: Session,
    user_id: int,
    *,
    except_device_id: int | None,
) -> int:
    query = db.query(Device).filter(
        Device.user_id == user_id,
        Device.is_active.is_(True),
    )
    if except_device_id is not None:
        query = query.filter(Device.id != except_device_id)
    return query.count()
