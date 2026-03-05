import json
from typing import Optional

from sqlalchemy.orm import Session

from mod.auth.request import LoginDeviceInfo
from mod.model import Device, DeviceType, Log, LogLevel, User


def upsert_device_action(
    db: Session,
    user: User,
    device_payload: Optional[LoginDeviceInfo],
    client_ip: Optional[str],
    proxy_ip: Optional[str],
) -> Optional[Device]:
    """
    Create or update a device record for the given user and payload.
    Does NOT commit the transaction; caller is responsible for db.commit().
    """
    if device_payload is None:
        return None

    device: Optional[Device] = (
        db.query(Device)
        .filter(
            (Device.device_fingerprint == device_payload.device_fingerprint)
            | (Device.imei == device_payload.imei),
        )
        .first()
    )

    if device is None:
        device = Device(
            user_id=user.id,
            imei=device_payload.imei,
            device_type=DeviceType(device_payload.device_type),
            device_fingerprint=device_payload.device_fingerprint,
            device_info=json.dumps(device_payload.device_info),
            current_lat=device_payload.current_lat,
            current_lng=device_payload.current_lng,
            ip_address=client_ip,
            proxy_ip_address=proxy_ip,
        )
        db.add(device)
    else:
        device.user_id = user.id
        device.device_type = DeviceType(device_payload.device_type)
        device.device_info = json.dumps(device_payload.device_info)
        device.current_lat = device_payload.current_lat
        device.current_lng = device_payload.current_lng
        device.ip_address = client_ip
        device.proxy_ip_address = proxy_ip

    db.flush()
    return device


def log_login_action(
    db: Session,
    user: User,
    device: Optional[Device],
    access_token: str,
    client_ip: Optional[str],
    proxy_ip: Optional[str],
    user_agent: Optional[str],
) -> None:
    """
    Persist an audit log entry for a successful login.
    Does NOT commit the transaction; caller is responsible for db.commit().
    """
    token_preview = access_token[:16] + "..." if access_token else ""
    payload = {
        "event": "login",
        "ip": client_ip,
        "proxy_ip": proxy_ip,
        "user_agent": user_agent,
        "access_token_preview": token_preview,
        "device_fingerprint": getattr(device, "device_fingerprint", None),
        "device_imei": getattr(device, "imei", None),
    }

    log = Log(
        user_id=user.id,
        device_id=getattr(device, "id", None),
        log_level=LogLevel.info.value,
        log_value=json.dumps(payload),
    )
    db.add(log)


def log_login_failure_action(
    db: Session,
    user: Optional[User],
    client_ip: Optional[str],
    proxy_ip: Optional[str],
    user_agent: Optional[str],
    reason: str,
) -> None:
    """
    Persist an audit log entry for failed login attempts.
    """
    payload = {
        "event": "login_failed",
        "reason": reason,
        "ip": client_ip,
        "proxy_ip": proxy_ip,
        "user_agent": user_agent,
        "email": getattr(user, "email", None),
        "user_id": getattr(user, "id", None),
    }

    log = Log(
        user_id=getattr(user, "id", None),
        device_id=None,
        log_level=LogLevel.warning.value,
        log_value=json.dumps(payload),
    )
    db.add(log)

