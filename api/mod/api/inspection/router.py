import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.helper import (
    compute_inspection_kpis,
    default_inspection_metrics,
    fetch_inspection_yes_no_metrics,
    map_inspection_detail,
    map_inspection_list_item,
    resolve_inspection_scope_filters,
)
from mod.api.inspection.response import (
    InspectionDetailResponse,
    InspectionKpisResponse,
    InspectionListResponse,
)
from mod.api.middleware import auth_dependency
from mod.model import Device, Inspection, InspectionType, Product, User
from utils.common import utc_end_exclusive_day_range
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    get_pagination_params,
    paginate_query,
)

router = APIRouter(
    tags=["Inspections"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/inspections/kpis",
    name="get_inspection_kpis",
    response_model=InspectionKpisResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_inspection_kpis(
    request: Request,
    date_from: date = Query(..., description="Range start (UTC calendar date)"),
    date_to: date = Query(..., description="Range end (UTC calendar date, inclusive)"),
    is_active: bool = Query(True),
    warehouse_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by warehouse UUID"
    ),
    plant_uuid: uuid.UUID | None = Query(None, description="Optional filter by plant UUID"),
    db: Session = Depends(get_db),
):
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_code, plant_code = resolve_inspection_scope_filters(
        db, warehouse_uuid, plant_uuid
    )
    counts = compute_inspection_kpis(
        db, date_from, date_to, is_active, warehouse_code, plant_code
    )
    return InspectionKpisResponse(
        date_from=date_from,
        date_to=date_to,
        **counts,
    )


@router.get(
    "/inspections",
    name="get_inspections",
    response_model=InspectionListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_inspections(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True),
    inspection_type: str | None = Query(
        None, description="Filter: inbound or outbound"
    ),
    warehouse_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by warehouse UUID"
    ),
    plant_uuid: uuid.UUID | None = Query(None, description="Optional filter by plant UUID"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
):
    if (date_from is None) ^ (date_to is None):
        raise HTTPException(
            status_code=400,
            detail="date_from and date_to must both be set or both omitted",
        )
    warehouse_code, plant_code = resolve_inspection_scope_filters(
        db, warehouse_uuid, plant_uuid
    )
    query = (
        db.query(Inspection)
        .join(Product, Inspection.product_id == Product.id)
        .join(Device, Inspection.device_id == Device.id)
        .outerjoin(User, Inspection.inspector_id == User.id)
        .options(
            joinedload(Inspection.inspector),
            joinedload(Inspection.device),
            joinedload(Inspection.product),
        )
        .filter(Inspection.is_active.is_(is_active))
    )
    if warehouse_code is not None:
        query = query.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        query = query.filter(Inspection.plant_code == plant_code)
    if date_from is not None and date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
        query = query.filter(
            Inspection.created_at >= start,
            Inspection.created_at < end_exclusive,
        )
    if inspection_type:
        try:
            it = InspectionType(inspection_type.strip().lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="inspection_type must be inbound or outbound",
            ) from None
        query = query.filter(Inspection.inspection_type == it)

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[
            User.name,
            Product.material_code,
            Product.material_description,
            Device.device_fingerprint,
            Device.imei,
        ],
        date_fields={
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        sort_fields={
            "id": Inspection.id,
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        default_sort_field="created_at",
    )

    total = query.count()
    page = params.page if params.page >= 1 else 1
    per_page = params.per_page if params.per_page >= 1 else 1
    items: list[Inspection] = paginate_query(query, page=page, per_page=per_page).all()
    ids = [row.id for row in items]
    metrics_by_id = fetch_inspection_yes_no_metrics(db, ids) if ids else {}
    data = [
        map_inspection_list_item(
            row, metrics_by_id.get(row.id, default_inspection_metrics())
        )
        for row in items
    ]
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return InspectionListResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get(
    "/inspections/{inspection_uuid}",
    name="get_inspection_detail",
    response_model=InspectionDetailResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_inspection_detail(
    request: Request,
    inspection_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    inspection = (
        db.query(Inspection)
        .options(
            joinedload(Inspection.inspector),
            joinedload(Inspection.device),
            joinedload(Inspection.product),
        )
        .filter(Inspection.uuid == inspection_uuid)
        .first()
    )
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return map_inspection_detail(inspection)
