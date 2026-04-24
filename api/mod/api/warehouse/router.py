import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.api.warehouse.helper import map_warehouse
from mod.api.warehouse.request import WarehouseCreateRequest, WarehouseUpdateRequest
from mod.api.warehouse.response import (
    WarehouseDeviceResponse,
    WarehouseInfoResponse,
    WarehouseInspectionResponse,
    WarehouseListResponse,
    WarehouseResponse,
    WarehouseUserResponse,
)
from mod.model import Device, Inspection, Warehouse
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Warehouses"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/warehouses",
    name="get_warehouses",
    description="List warehouses with pagination and filters",
    response_model=WarehouseListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_warehouses(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    query = db.query(Warehouse).filter(Warehouse.is_active.is_(is_active))

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Warehouse.warehouse_code, Warehouse.name, Warehouse.city],
        date_fields={
            "created_at": Warehouse.created_at,
            "updated_at": Warehouse.updated_at,
        },
        sort_fields={
            "id": Warehouse.id,
            "warehouse_code": Warehouse.warehouse_code,
            "name": Warehouse.name,
            "city": Warehouse.city,
            "created_at": Warehouse.created_at,
            "updated_at": Warehouse.updated_at,
        },
        default_sort_field="id",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_warehouse,
    )


@router.post(
    "/warehouses",
    name="create_warehouse",
    description="Create warehouse",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def create_warehouse(
    request: Request,
    payload: WarehouseCreateRequest,
    db: Session = Depends(get_db),
):
    existing_code = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code == payload.warehouse_code)
        .first()
    )
    if existing_code is not None:
        raise HTTPException(status_code=409, detail="Warehouse code already exists")

    existing_name = db.query(Warehouse).filter(Warehouse.name == payload.name).first()
    if existing_name is not None:
        raise HTTPException(status_code=409, detail="Warehouse name already exists")

    warehouse = Warehouse(
        warehouse_code=payload.warehouse_code,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        address=payload.address,
        city=payload.city,
        postal_code=str(payload.postal_code),
        is_active=True,
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return map_warehouse(warehouse)


@router.get(
    "/warehouses/{warehouse_uuid}",
    name="get_warehouse_info",
    description="Get warehouse with users, devices and inspections",
    response_model=WarehouseInfoResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_warehouse_info(
    request: Request,
    warehouse_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    warehouse = db.query(Warehouse).filter(Warehouse.uuid == warehouse_uuid).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    inspections = (
        db.query(Inspection)
        .options(
            joinedload(Inspection.inspector),
            joinedload(Inspection.device).joinedload(Device.user),
        )
        .filter(Inspection.warehouse_code == warehouse.warehouse_code)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    users_map: dict[int, WarehouseUserResponse] = {}
    devices_map: dict[int, WarehouseDeviceResponse] = {}
    inspection_rows: list[WarehouseInspectionResponse] = []

    for inspection in inspections:
        inspector = inspection.inspector
        device = inspection.device

        if inspector and inspector.id not in users_map:
            users_map[inspector.id] = WarehouseUserResponse(
                id=inspector.id,
                uuid=inspector.uuid,
                name=inspector.name,
                email=inspector.email,
                mobile_number=inspector.mobile_number,
                designation=inspector.designation,
                is_active=bool(inspector.is_active),
            )

        if device and device.id not in devices_map:
            devices_map[device.id] = WarehouseDeviceResponse(
                id=device.id,
                uuid=device.uuid,
                user_id=device.user_id,
                user_name=device.user.name if device.user else "",
                imei=device.imei,
                device_type=device.device_type.value
                if hasattr(device.device_type, "value")
                else str(device.device_type),
                is_locked=bool(device.is_locked),
                is_active=bool(device.is_active),
            )

        inspection_rows.append(
            WarehouseInspectionResponse(
                id=inspection.id,
                uuid=inspection.uuid,
                inspector_id=inspection.inspector_id,
                inspector_name=inspector.name if inspector else "",
                device_id=inspection.device_id,
                inspection_type=inspection.inspection_type.value
                if hasattr(inspection.inspection_type, "value")
                else str(inspection.inspection_type),
                product_id=inspection.product_id,
                checklist_id=inspection.checklist_id,
                warehouse_code=inspection.warehouse_code,
                created_at=inspection.created_at,
            )
        )

    return WarehouseInfoResponse(
        warehouse=map_warehouse(warehouse),
        users=list(users_map.values()),
        devices=list(devices_map.values()),
        inspections=inspection_rows,
    )


@router.put(
    "/warehouses/{warehouse_uuid}",
    name="update_warehouse",
    description="Update warehouse",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def update_warehouse(
    request: Request,
    warehouse_uuid: uuid.UUID,
    payload: WarehouseUpdateRequest,
    db: Session = Depends(get_db),
):
    warehouse = db.query(Warehouse).filter(Warehouse.uuid == warehouse_uuid).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    duplicate_code = (
        db.query(Warehouse)
        .filter(
            Warehouse.warehouse_code == payload.warehouse_code,
            Warehouse.id != warehouse.id,
        )
        .first()
    )
    if duplicate_code is not None:
        raise HTTPException(status_code=409, detail="Warehouse code already exists")

    duplicate_name = (
        db.query(Warehouse)
        .filter(Warehouse.name == payload.name, Warehouse.id != warehouse.id)
        .first()
    )
    if duplicate_name is not None:
        raise HTTPException(status_code=409, detail="Warehouse name already exists")

    warehouse.warehouse_code = payload.warehouse_code
    warehouse.name = payload.name
    warehouse.lat = payload.lat
    warehouse.lng = payload.lng
    warehouse.address = payload.address
    warehouse.city = payload.city
    warehouse.postal_code = str(payload.postal_code)
    warehouse.is_active = payload.is_active

    db.commit()
    db.refresh(warehouse)
    return map_warehouse(warehouse)


@router.delete(
    "/warehouses/{warehouse_uuid}",
    name="delete_warehouse",
    description="Delete (deactivate) warehouse",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def delete_warehouse(
    request: Request,
    warehouse_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    warehouse = db.query(Warehouse).filter(Warehouse.uuid == warehouse_uuid).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    warehouse.is_active = False
    db.commit()
    db.refresh(warehouse)
    return map_warehouse(warehouse)
