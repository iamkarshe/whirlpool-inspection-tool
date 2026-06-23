import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from mod.api.facility_metrics import (
    empty_facility_stats,
    facility_stats_batch_by_warehouse_code,
    facility_stats_for_warehouse,
)
from mod.api.log.audit import audit_master_from_request
from mod.api.middleware import auth_dependency
from mod.api.warehouse.helper import (
    get_warehouse_by_uuid_or_404,
    map_warehouse,
    permanently_delete_warehouse,
)
from mod.api.warehouse.request import WarehouseCreateRequest, WarehouseUpdateRequest
from mod.api.warehouse.response import (
    WarehouseListResponse,
    WarehousePermanentDeleteResponse,
    WarehouseResponse,
)
from mod.model import Warehouse
from utils.common import read_csv_upload, to_proper_case
from utils.critical_admin_delete import require_critical_admin_delete_token
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.facility_csv_upsert import bulk_upsert_facility_rows, parse_facility_csv_row
from utils.roles import ROLES_MASTER_READ, ROLES_MASTER_WRITE
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    get_pagination_params,
    paginate_query,
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
@check_api_role(ROLES_MASTER_READ)
def get_warehouses(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool | None = Query(
        None,
        description="Filter by active status; omit to return all warehouses.",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Warehouse)
    if is_active is not None:
        query = query.filter(Warehouse.is_active.is_(is_active))

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

    total = query.count()
    page = params.page
    per_page = params.per_page
    items = paginate_query(query, page=page, per_page=per_page).all()
    stats_map = facility_stats_batch_by_warehouse_code(
        db, [w.warehouse_code for w in items], is_active=True
    )
    data = [
        map_warehouse(
            w,
            stats=stats_map.get(w.warehouse_code, empty_facility_stats()),
        )
        for w in items
    ]
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return WarehouseListResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post(
    "/warehouses",
    name="create_warehouse",
    description="Create warehouse",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_WRITE)
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
    db.flush()
    audit_master_from_request(
        db,
        request,
        resource_type="warehouse",
        resource_key=warehouse.warehouse_code,
        operation="created",
        summary=f"Warehouse {warehouse.warehouse_code} created",
    )
    db.commit()
    db.refresh(warehouse)
    return map_warehouse(warehouse, stats=empty_facility_stats())


@router.get(
    "/warehouses/{warehouse_uuid}",
    name="get_warehouse_info",
    description="Get warehouse details",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_READ)
def get_warehouse_info(
    request: Request,
    warehouse_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    warehouse = get_warehouse_by_uuid_or_404(db, warehouse_uuid)
    stats = facility_stats_for_warehouse(db, warehouse.warehouse_code, is_active=True)
    return map_warehouse(warehouse, stats=stats)


@router.put(
    "/warehouses/{warehouse_uuid}",
    name="update_warehouse",
    description="Update warehouse",
    response_model=WarehouseResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_WRITE)
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

    audit_master_from_request(
        db,
        request,
        resource_type="warehouse",
        resource_key=warehouse.warehouse_code,
        operation="updated",
        summary=f"Warehouse {warehouse.warehouse_code} updated",
    )
    db.commit()
    db.refresh(warehouse)
    stats = facility_stats_for_warehouse(db, warehouse.warehouse_code, is_active=True)
    return map_warehouse(warehouse, stats=stats)


@router.delete(
    "/warehouses/{warehouse_uuid}",
    name="delete_warehouse_permanently",
    description="Permanently delete warehouse (requires x-critical-admin-delete-token).",
    response_model=WarehousePermanentDeleteResponse,
    responses={
        401: {"description": "Invalid or missing x-critical-admin-delete-token."},
        409: {"description": "Warehouse is referenced by inspections."},
        503: {"description": "CRITICAL_ADMIN_DELETE_TOKEN is not configured."},
    },
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_WRITE)
def delete_warehouse_permanently(
    request: Request,
    warehouse_uuid: uuid.UUID,
    _: None = Depends(require_critical_admin_delete_token),
    db: Session = Depends(get_db),
) -> WarehousePermanentDeleteResponse:
    warehouse = get_warehouse_by_uuid_or_404(db, warehouse_uuid)
    warehouse_code = permanently_delete_warehouse(db, warehouse)
    audit_master_from_request(
        db,
        request,
        resource_type="warehouse",
        resource_key=warehouse_code,
        operation="deleted_permanently",
        summary=f"Warehouse {warehouse_code} permanently deleted",
    )
    db.commit()
    return WarehousePermanentDeleteResponse(
        message=f"Warehouse {warehouse_code} permanently deleted",
        warehouse_code=warehouse_code,
    )


@router.get(
    "/warehouses/csv/template",
    name="download_warehouses_csv_template",
    description="Download warehouse CSV template with existing data",
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_READ)
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
@check_api_role(ROLES_MASTER_WRITE)
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
        parsed_row, error_message = parse_facility_csv_row(
            row_number,
            row,
            code_field="warehouse_code",
            seen_codes=seen_codes,
        )
        if error_message:
            skipped += 1
            errors.append(error_message)
            continue
        valid_rows.append(parsed_row)

    if valid_rows:
        created, updated = bulk_upsert_facility_rows(
            db,
            Warehouse,
            code_attr="warehouse_code",
            valid_rows=valid_rows,
        )
        audit_master_from_request(
            db,
            request,
            resource_type="warehouse",
            resource_key="bulk_csv",
            operation="upserted",
            summary=f"Warehouses CSV upsert: {len(valid_rows)} row(s)",
        )
        db.commit()
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
