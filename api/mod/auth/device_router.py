import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.auth.helper import (
    build_active_device_list_response,
    deregister_user_device_by_uuid,
    resolve_active_devices_for_user,
)
from mod.auth.request import ResolveDevicesRequest
from mod.auth.response import (
    ActiveDeviceListResponse,
    DeregisterDeviceResponse,
    ResolveDevicesResponse,
)
from mod.model import Device
from utils.db import get_db

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
    current_uuid = None
    device_id = getattr(request.state, "device_id", None)
    if device_id is not None:
        current = db.query(Device).filter(Device.id == device_id).first()
        current_uuid = current.uuid if current is not None else None
    return build_active_device_list_response(
        db,
        user_id,
        current_device_uuid=current_uuid,
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
    response = resolve_active_devices_for_user(
        db,
        int(request.state.user_id),
        payload,
    )
    db.commit()
    return response


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
    response = deregister_user_device_by_uuid(
        db,
        int(request.state.user_id),
        device_uuid,
    )
    db.commit()
    return response
