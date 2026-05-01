import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from mod.api.middleware import auth_dependency
from mod.api.warehouse.helper import get_warehouse_by_uuid_or_404, map_warehouse
from mod.api.warehouse.request import WarehouseCreateRequest, WarehouseUpdateRequest
from mod.api.warehouse.response import WarehouseListResponse, WarehouseResponse
from mod.model import Warehouse
from utils.common import read_csv_upload, to_proper_case
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
        city=to_proper_case(payload.city),
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
    description="Get warehouse details",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_warehouse_info(
    request: Request,
    warehouse_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    warehouse = get_warehouse_by_uuid_or_404(db, warehouse_uuid)
    return map_warehouse(warehouse)


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
    warehouse = get_warehouse_by_uuid_or_404(db, warehouse_uuid)

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
    warehouse.city = to_proper_case(payload.city)
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
    warehouse = get_warehouse_by_uuid_or_404(db, warehouse_uuid)

    warehouse.is_active = False
    db.commit()
    db.refresh(warehouse)
    return map_warehouse(warehouse)


@router.get(
    "/warehouses/csv/template",
    name="download_warehouses_csv_template",
    description="Download warehouse CSV template with existing data",
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def download_warehouses_csv_template(
    request: Request,
    db: Session = Depends(get_db),
):
    warehouses = db.query(Warehouse).order_by(Warehouse.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "warehouse_code",
            "name",
            "address",
            "city",
            "lat",
            "lng",
            "postal_code",
            "is_active",
        ]
    )

    for warehouse in warehouses:
        writer.writerow(
            [
                warehouse.warehouse_code,
                warehouse.name,
                warehouse.address,
                warehouse.city,
                warehouse.lat if warehouse.lat is not None else "",
                warehouse.lng if warehouse.lng is not None else "",
                warehouse.postal_code,
                "true" if warehouse.is_active else "false",
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="warehouses_template.csv"'
        },
    )


@router.post(
    "/warehouses/csv/upload",
    name="upload_warehouses_csv",
    description="Bulk upsert warehouses from CSV",
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def upload_warehouses_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    required_headers = {
        "warehouse_code",
        "name",
        "address",
        "city",
        "lat",
        "lng",
        "postal_code",
    }
    rows = read_csv_upload(file=file, required_headers=required_headers)

    valid_rows: list[dict[str, object]] = []
    skipped = 0
    errors: list[str] = []
    seen_codes: set[str] = set()

    for row_number, row in enumerate(rows, start=2):
        warehouse_code = (row.get("warehouse_code") or "").strip()
        name = (row.get("name") or "").strip()
        address = (row.get("address") or "").strip()
        city = to_proper_case((row.get("city") or ""))
        lat_raw = (row.get("lat") or "").strip()
        lng_raw = (row.get("lng") or "").strip()
        postal_code_raw = (row.get("postal_code") or "").strip()
        is_active_raw = (row.get("is_active") or "true").strip().lower()

        if not all(
            [warehouse_code, name, address, city, lat_raw, lng_raw, postal_code_raw]
        ):
            skipped += 1
            errors.append(f"Row {row_number}: required field is missing")
            continue

        if warehouse_code in seen_codes:
            skipped += 1
            errors.append(
                f"Row {row_number}: duplicate warehouse_code in same upload ({warehouse_code})"
            )
            continue
        seen_codes.add(warehouse_code)

        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
            postal_code = int(postal_code_raw)
            if postal_code < 0:
                raise ValueError("postal code must be non-negative")
        except ValueError as ex:
            skipped += 1
            errors.append(f"Row {row_number}: invalid numeric value ({str(ex)})")
            continue

        is_active = is_active_raw not in {"false", "0", "no"}

        valid_rows.append(
            {
                "warehouse_code": warehouse_code,
                "name": name,
                "address": address,
                "city": city,
                "lat": lat,
                "lng": lng,
                "postal_code": str(postal_code),
                "is_active": is_active,
            }
        )

    if valid_rows:
        existing_codes = {
            code
            for (code,) in db.query(Warehouse.warehouse_code)
            .filter(
                Warehouse.warehouse_code.in_([r["warehouse_code"] for r in valid_rows])
            )
            .all()
        }

        stmt = insert(Warehouse).values(valid_rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Warehouse.warehouse_code],
            set_={
                "name": stmt.excluded.name,
                "address": stmt.excluded.address,
                "city": stmt.excluded.city,
                "lat": stmt.excluded.lat,
                "lng": stmt.excluded.lng,
                "postal_code": stmt.excluded.postal_code,
                "is_active": stmt.excluded.is_active,
            },
        )
        try:
            db.execute(stmt)
            db.commit()
        except IntegrityError as ex:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"CSV upsert failed due to unique constraint conflict: {str(ex.orig)}",
            )

        created = len(
            [r for r in valid_rows if r["warehouse_code"] not in existing_codes]
        )
        updated = len(valid_rows) - created
    else:
        created = 0
        updated = 0

    return {
        "success": True,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
