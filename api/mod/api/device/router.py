import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

from mod.api.device.helper import map_device
from mod.api.device.response import (
    DeviceInspectionListResponse,
    DeviceInspectionResponse,
    DeviceKpiResponse,
    DeviceListResponse,
    DeviceResponse,
)
from mod.api.middleware import auth_dependency
from mod.model import Device, Inspection, User
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Devices"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/devices",
    name="get_devices",
    description="List devices with pagination and filters",
    response_model=DeviceListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_devices(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Device)
        .join(User, Device.user_id == User.id)
        .options(joinedload(Device.user))
    )

    query = query.filter(Device.is_active.is_(is_active))

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[
            Device.imei,
            Device.device_fingerprint,
            Device.device_type,
            User.name,
        ],
        date_fields={
            "created_at": Device.created_at,
            "updated_at": Device.updated_at,
        },
        sort_fields={
            "id": Device.id,
            "imei": Device.imei,
            "device_type": Device.device_type,
            "is_locked": Device.is_locked,
            "is_active": Device.is_active,
            "created_at": Device.created_at,
            "updated_at": Device.updated_at,
        },
        default_sort_field="id",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_device,
    )


@router.get(
    "/devices/kpi",
    name="get_devices_kpi",
    description="Get device dashboard KPIs",
    response_model=DeviceKpiResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_devices_kpi(
    request: Request,
    db: Session = Depends(get_db),
):
    active_since = datetime.now(timezone.utc) - timedelta(minutes=15)

    total = db.query(func.count(Device.id)).scalar() or 0
    active = (
        db.query(func.count(Device.id))
        .filter(
            and_(
                Device.is_active.is_(True),
                Device.is_locked.is_(False),
                Device.updated_at >= active_since,
            )
        )
        .scalar()
        or 0
    )
    deleted = (
        db.query(func.count(Device.id)).filter(Device.is_active.is_(False)).scalar()
        or 0
    )
    locked = (
        db.query(func.count(Device.id)).filter(Device.is_locked.is_(True)).scalar() or 0
    )
    unlocked = (
        db.query(func.count(Device.id)).filter(Device.is_locked.is_(False)).scalar()
        or 0
    )
    mobile = (
        db.query(func.count(Device.id)).filter(Device.device_type == "mobile").scalar()
        or 0
    )
    desktop = (
        db.query(func.count(Device.id)).filter(Device.device_type == "desktop").scalar()
        or 0
    )

    return DeviceKpiResponse(
        total=total,
        active=active,
        deleted=deleted,
        locked=locked,
        unlocked=unlocked,
        desktop=desktop,
        mobile=mobile,
    )


@router.get(
    "/devices/{device_uuid}",
    name="get_device",
    description="Get one device by uuid",
    response_model=DeviceResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_device(
    request: Request,
    device_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .options(joinedload(Device.user))
        .filter(Device.uuid == device_uuid)
        .first()
    )
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return map_device(device)


@router.get(
    "/devices/{device_uuid}/inspections",
    name="get_device_inspections",
    description="List inspections for a device",
    response_model=DeviceInspectionListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_device_inspections(
    request: Request,
    device_uuid: uuid.UUID,
    params: PaginationParams = Depends(get_pagination_params),
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.uuid == device_uuid).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    query = (
        db.query(Inspection)
        .join(User, Inspection.inspector_id == User.id)
        .options(joinedload(Inspection.inspector))
        .filter(Inspection.device_id == device.id)
    )

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Inspection.inspection_type, User.name],
        date_fields={
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        sort_fields={
            "id": Inspection.id,
            "inspection_type": Inspection.inspection_type,
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        default_sort_field="id",
    )

    def mapper(inspection: Inspection) -> DeviceInspectionResponse:
        return DeviceInspectionResponse(
            id=inspection.id,
            uuid=inspection.uuid,
            inspector_id=inspection.inspector_id,
            inspector_name=inspection.inspector.name if inspection.inspector else "",
            inspection_type=inspection.inspection_type.value
            if hasattr(inspection.inspection_type, "value")
            else str(inspection.inspection_type),
            product_id=inspection.product_id,
            checklist_id=inspection.checklist_id,
            lat=inspection.lat,
            lng=inspection.lng,
            ip_address=str(inspection.ip_address)
            if inspection.ip_address is not None
            else None,
            created_at=inspection.created_at,
            updated_at=inspection.updated_at,
        )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=mapper,
    )


@router.patch(
    "/devices/{device_uuid}/lock",
    name="lock_device",
    description="Lock a device",
    response_model=DeviceResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def lock_device(
    request: Request,
    device_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .options(joinedload(Device.user))
        .filter(Device.uuid == device_uuid)
        .first()
    )

    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.is_active is False:
        raise HTTPException(status_code=400, detail="Device is not active")

    device.is_locked = True
    db.commit()
    db.refresh(device)
    return map_device(device)


@router.patch(
    "/devices/{device_uuid}/unlock",
    name="unlock_device",
    description="Unlock a device",
    response_model=DeviceResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def unlock_device(
    request: Request,
    device_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .options(joinedload(Device.user))
        .filter(Device.uuid == device_uuid)
        .first()
    )

    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.is_active is False:
        raise HTTPException(status_code=400, detail="Device is not active")

    device.is_locked = False
    db.commit()
    db.refresh(device)
    return map_device(device)


@router.delete(
    "/devices/{device_uuid}",
    name="delete_device",
    description="Delete (deactivate) a device",
    response_model=DeviceResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def delete_device(
    request: Request,
    device_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .options(joinedload(Device.user))
        .filter(Device.uuid == device_uuid)
        .first()
    )
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = False
    db.commit()
    db.refresh(device)
    return map_device(device)
