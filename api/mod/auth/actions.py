import json

from typing import Optional

from sqlalchemy.orm import Session

from mod.auth.request import LoginDeviceInfo
from mod.auth.session import deactivate_push_subscriptions_for_user_except_device
from mod.api.log.audit import log_auth_login_failed, log_auth_login_success
from mod.model import Device, DeviceType, User


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

    device.is_active = True
    db.flush()
    deactivate_push_subscriptions_for_user_except_device(
        db,
        user.id,
        except_device_id=device.id,
    )
    return device


def build_login_device_metadata(
    device_payload: Optional[LoginDeviceInfo],
) -> dict[str, str | None]:
    if device_payload is None:
        return {"device_present": False}
    return {
        "device_present": True,
        "device_type": device_payload.device_type,
        "device_fingerprint": device_payload.device_fingerprint,
        "device_imei": device_payload.imei,
    }


def log_login_action(
    db: Session,
    user: User,
    device: Optional[Device],
    access_token: str,
    client_ip: Optional[str],
    proxy_ip: Optional[str],
    user_agent: Optional[str],
    *,
    attempted_email: Optional[str] = None,
    login_method: str = "password",
    login_metadata: Optional[dict] = None,
) -> None:
    """
    Persist an audit log entry for a successful login.
    Does NOT commit the transaction; caller is responsible for db.commit().
    """
    token_preview = access_token[:16] + "..." if access_token else ""
    log_auth_login_success(
        db,
        user_id=user.id,
        device_id=getattr(device, "id", None),
        client_ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        access_token_preview=token_preview,
        device_fingerprint=getattr(device, "device_fingerprint", None),
        device_imei=getattr(device, "imei", None),
        attempted_email=attempted_email or user.email,
        login_method=login_method,
        login_metadata=login_metadata,
    )


def log_login_failure_action(
    db: Session,
    user: Optional[User],
    client_ip: Optional[str],
    proxy_ip: Optional[str],
    user_agent: Optional[str],
    reason: str,
    *,
    attempted_email: Optional[str] = None,
    login_method: str = "password",
    login_metadata: Optional[dict] = None,
) -> None:
    """
    Persist an audit log entry for failed login attempts.
    """
    log_auth_login_failed(
        db,
        user_id=getattr(user, "id", None),
        email=getattr(user, "email", None),
        reason=reason,
        client_ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        attempted_email=attempted_email,
        login_method=login_method,
        login_metadata=login_metadata,
    )
