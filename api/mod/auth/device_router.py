import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.auth.device_helper import list_active_devices_for_user
from mod.auth.request import ResolveDevicesRequest
from mod.auth.response import (
    ActiveDeviceListResponse,
    DeregisterDeviceResponse,
    ResolveDevicesResponse,
)
from mod.auth.session import deregister_device
from mod.model import Device
from utils.db import get_db
from utils.env import get_allow_multi_login

router = APIRouter(
    tags=["Auth"],
    prefix="/auth/devices",
    dependencies=[Depends(auth_dependency)],
)


@router.get(
    "/active",
    response_model=ActiveDeviceListResponse,
    name="list_active_auth_devices",
    summary="List active devices for the current user",
)
def list_active_devices(
    request: Request,
    db: Session = Depends(get_db),
) -> ActiveDeviceListResponse:
    user_id = int(request.state.user_id)
    device_id = getattr(request.state, "device_id", None)
    current_uuid = None
    if device_id is not None:
        current = db.query(Device).filter(Device.id == device_id).first()
        current_uuid = current.uuid if current is not None else None

    return ActiveDeviceListResponse(
        allow_multi_login=get_allow_multi_login(),
        devices=list_active_devices_for_user(
            db,
            user_id,
            current_device_uuid=current_uuid,
        ),
    )


@router.post(
    "/resolve",
    response_model=ResolveDevicesResponse,
    name="resolve_auth_devices",
    summary="Keep selected devices and deregister the rest (single-login mode)",
)
def resolve_active_devices(
    request: Request,
    payload: ResolveDevicesRequest,
    db: Session = Depends(get_db),
) -> ResolveDevicesResponse:
    if get_allow_multi_login():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device selection is not required when multi-login is enabled",
        )

    user_id = int(request.state.user_id)
    keep_uuids = list(dict.fromkeys(payload.keep_device_uuids))

    active_devices = (
        db.query(Device)
        .filter(
            Device.user_id == user_id,
            Device.is_active.is_(True),
        )
        .all()
    )
    active_by_uuid = {device.uuid: device for device in active_devices}

    unknown = [value for value in keep_uuids if value not in active_by_uuid]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more devices are not active for this account",
        )

    kept: list[uuid.UUID] = []
    deregistered: list[uuid.UUID] = []
    keep_set = set(keep_uuids)

    for device in active_devices:
        if device.uuid in keep_set:
            kept.append(device.uuid)
            continue
        deregister_device(db, device)
        deregistered.append(device.uuid)

    db.commit()
    return ResolveDevicesResponse(
        kept_device_uuids=kept,
        deregistered_device_uuids=deregistered,
    )


@router.post(
    "/{device_uuid}/deregister",
    response_model=DeregisterDeviceResponse,
    name="deregister_auth_device",
    summary="Deregister a device and revoke its sessions",
)
def deregister_user_device(
    request: Request,
    device_uuid: uuid.UUID,
    db: Session = Depends(get_db),
) -> DeregisterDeviceResponse:
    user_id = int(request.state.user_id)
    device = (
        db.query(Device)
        .filter(
            Device.uuid == device_uuid,
            Device.user_id == user_id,
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if not device.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device is already deregistered",
        )

    deregister_device(db, device)
    db.commit()

    return DeregisterDeviceResponse(device_uuid=device.uuid)
