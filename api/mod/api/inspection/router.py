import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.checklist_inspection import InspectionWithChecklistPayload
from mod.api.inspection.helper import (
    build_active_checklist_grouped_response,
    build_barcode_parse_response,
    compute_inspection_kpis,
    create_inbound_inspection,
    default_inspection_metrics,
    fetch_inspection_yes_no_metrics,
    get_inspection_entity_by_uuid,
    map_inspection_list_item,
    present_inspection_full,
    resolve_inspection_scope_filters,
    update_inspection_review_status,
)
from mod.api.inspection.response import (
    ActiveChecklistGroupedResponse,
    BarcodeParseResponse,
    InspectionFullResponse,
    InspectionKpisResponse,
    InspectionListResponse,
    InspectionReviewStatusUpdateRequest,
    StartInboundInspectionRequest,
)
from mod.api.middleware import auth_dependency
from mod.model import Device, Inspection, InspectionType, Product, User
from utils.common import (
    default_utc_calendar_dates_last_7_days,
    utc_end_exclusive_day_range,
)
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
    date_from: date | None = Query(
        None,
        description="Range start (UTC calendar date); omit with date_to for default: last 7 days including today",
    ),
    date_to: date | None = Query(
        None,
        description="Range end (UTC calendar date, inclusive); omit with date_from for default: last 7 days including today",
    ),
    is_active: bool = Query(True),
    warehouse_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by warehouse UUID"
    ),
    plant_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by plant UUID"
    ),
    db: Session = Depends(get_db),
):
    if (date_from is None) ^ (date_to is None):
        raise HTTPException(
            status_code=400,
            detail="date_from and date_to must both be set or both omitted",
        )
    if date_from is None and date_to is None:
        date_from, date_to = default_utc_calendar_dates_last_7_days()
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
    plant_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by plant UUID"
    ),
    date_from: date | None = Query(
        None,
        description="created_at range start (UTC date); provide with date_to to apply date filtering",
    ),
    date_to: date | None = Query(
        None,
        description="created_at range end (UTC date, inclusive); provide with date_from to apply date filtering",
    ),
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
            joinedload(Inspection.reviewer),
            joinedload(Inspection.device),
            joinedload(Inspection.product),
            joinedload(Inspection.product_unit),
        )
        .filter(Inspection.is_active.is_(is_active))
    )
    if warehouse_code is not None:
        query = query.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        query = query.filter(Inspection.supplier_plant_code == plant_code)
    if date_from is not None and date_to is not None:
        if date_to < date_from:
            raise HTTPException(
                status_code=400, detail="date_to must be on or after date_from"
            )
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
        date_default_range=False,
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
    "/inspections/parse-barcode",
    name="parse_inspection_barcode",
    response_model=BarcodeParseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def parse_inspection_barcode(
    request: Request,
    barcode: str = Query(
        ...,
        description="16-character product barcode: 1-5 material, 6-7 compressor, 8-9 year, 10-11 week, 12-16 serial",
    ),
    db: Session = Depends(get_db),
):
    return build_barcode_parse_response(db, barcode)


@router.get(
    "/inspections/checklist",
    name="get_active_inspection_checklist",
    response_model=ActiveChecklistGroupedResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def get_active_inspection_checklist(
    request: Request,
    db: Session = Depends(get_db),
):
    return build_active_checklist_grouped_response(db)


@router.post(
    "/inspections/inbound",
    name="start_inbound_inspection",
    response_model=InspectionWithChecklistPayload,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def start_inbound_inspection(
    request: Request,
    body: StartInboundInspectionRequest,
    db: Session = Depends(get_db),
):
    return create_inbound_inspection(db, request, body)


@router.patch(
    "/inspections/{inspection_uuid}/review-status",
    name="patch_inspection_review_status",
    response_model=InspectionFullResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def patch_inspection_review_status(
    request: Request,
    inspection_uuid: uuid.UUID,
    body: InspectionReviewStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    return update_inspection_review_status(db, request, inspection_uuid, body)


@router.get(
    "/inspections/{inspection_uuid}",
    name="get_inspection_detail",
    response_model=InspectionFullResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_inspection_detail(
    request: Request,
    inspection_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    inspection = get_inspection_entity_by_uuid(db, inspection_uuid)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return present_inspection_full(inspection)
