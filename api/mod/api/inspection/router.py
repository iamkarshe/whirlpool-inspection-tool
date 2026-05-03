import uuid
from datetime import date
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.checklist_inspection import InspectionWithChecklistPayload
from mod.api.inspection.helper import (
    acquire_inspection_barcode_lock,
    build_active_checklist_grouped_response,
    build_barcode_parse_response,
    build_inspection_metadata_response,
    compute_inspection_analytics_kpis,
    compute_inspection_kpis,
    compute_manager_inspection_team_kpis,
    compute_operator_inspection_kpis,
    create_inbound_inspection,
    create_outbound_inspection,
    deactivate_inspection,
    default_inspection_metrics,
    fetch_inspection_yes_no_metrics,
    get_inspection_entity_by_uuid,
    map_barcode_lock_row,
    map_inspection_list_item,
    present_inspection_full,
    release_inspection_barcode_lock,
    resolve_inspection_kpi_warehouse_codes,
    resolve_inspection_scope_filters,
    save_inspection_image_upload,
    update_inspection_review_status,
)
from mod.api.inspection.response import (
    ActiveChecklistGroupedResponse,
    BarcodeLockAcquireRequest,
    BarcodeLockReleaseResponse,
    BarcodeLockResponse,
    BarcodeParseResponse,
    InspectionAnalyticsKpis,
    InspectionFullResponse,
    InspectionImageUploadResponse,
    InspectionKpisResponse,
    ManagerInspectionTeamKpisResponse,
    ManagerTeamInspectionAllKpis,
    ManagerTeamInspectionDirectionKpis,
    OperatorInspectionDirectionKpis,
    OperatorInspectionKpisResponse,
    InspectionListResponse,
    InspectionMetadataResponse,
    InspectionReviewStatusUpdateRequest,
    StartInboundInspectionRequest,
    StartOutboundInspectionRequest,
)
from mod.api.middleware import auth_dependency
from mod.model import Device, Inspection, InspectionType, Product, User
from utils.common import resolve_inspection_kpi_period, utc_end_exclusive_day_range
from utils.db import get_db
from utils.decorator import (
    apply_operator_scope_filters,
    check_api_role,
    exception_handler_decorator,
    request_is_operator_only,
)
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
@check_api_role(["superadmin", "manager", "operator"])
def get_inspection_kpis(
    request: Request,
    period: Literal["custom", "today", "yesterday", "week", "month"] = Query(
        "custom",
        description=(
            "UTC date window: today, yesterday, this calendar week (Mon–today), "
            "this calendar month, or custom. For custom, omit both dates for last 7 days."
        ),
    ),
    date_from: date | None = Query(
        None,
        description="With period=custom: range start (UTC); omit both dates for last 7 days",
    ),
    date_to: date | None = Query(
        None,
        description="With period=custom: range end (UTC, inclusive); omit both dates for last 7 days",
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
    try:
        date_from, date_to, period_norm = resolve_inspection_kpi_period(
            period, date_from, date_to
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, warehouse_uuid
    )
    _, plant_code = resolve_inspection_scope_filters(db, None, plant_uuid)
    uid = int(request.state.user_id)
    operator_only = request_is_operator_only(request)
    role_raw = getattr(request.state, "role", None) or ""
    roles = [r.strip() for r in str(role_raw).split(",") if r.strip()]
    superadmin = "superadmin" in roles
    counts = compute_inspection_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_code=None,
        plant_code=plant_code,
        warehouse_codes=warehouse_codes,
        inspector_id=uid if operator_only else None,
    )
    analytics_counts = compute_inspection_analytics_kpis(
        db,
        date_from=date_from,
        date_to=date_to,
        is_active=is_active,
        warehouse_codes=warehouse_codes,
        plant_code=plant_code,
        user_id=uid,
        operator_mode=operator_only,
        approvals_rejections_any_reviewer=superadmin and not operator_only,
    )
    return InspectionKpisResponse(
        period=period_norm,
        date_from=date_from,
        date_to=date_to,
        analytics=InspectionAnalyticsKpis(**analytics_counts),
        **counts,
    )


@router.get(
    "/inspections/kpis/manager",
    name="get_inspection_kpis_manager",
    response_model=ManagerInspectionTeamKpisResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_inspection_kpis_manager(
    request: Request,
    period: Literal["custom", "today", "yesterday", "week", "month"] = Query(
        "custom",
        description=(
            "UTC date window: today, yesterday, this calendar week (Mon–today), "
            "this calendar month, or custom. For custom, omit both dates for last 7 days."
        ),
    ),
    date_from: date | None = Query(
        None,
        description="With period=custom: range start (UTC); omit both dates for last 7 days",
    ),
    date_to: date | None = Query(
        None,
        description="With period=custom: range end (UTC, inclusive); omit both dates for last 7 days",
    ),
    is_active: bool = Query(True),
    warehouse_uuid: uuid.UUID | None = Query(
        None,
        description="Optional filter by warehouse UUID (superadmin or allowed scope)",
    ),
    plant_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by plant UUID"
    ),
    db: Session = Depends(get_db),
):
    """Manager team overview KPIs: warehouse scope matches assigned warehouses."""
    try:
        date_from, date_to, period_norm = resolve_inspection_kpi_period(
            period, date_from, date_to
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, warehouse_uuid
    )
    _, plant_code = resolve_inspection_scope_filters(db, None, plant_uuid)
    payload = compute_manager_inspection_team_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_codes=warehouse_codes,
        plant_code=plant_code,
    )
    return ManagerInspectionTeamKpisResponse(
        period=period_norm,
        date_from=date_from,
        date_to=date_to,
        review_queue=payload["review_queue"],
        all_inspections=ManagerTeamInspectionAllKpis(**payload["all_inspections"]),
        inbound=ManagerTeamInspectionDirectionKpis(**payload["inbound"]),
        outbound=ManagerTeamInspectionDirectionKpis(**payload["outbound"]),
    )


@router.get(
    "/inspections/kpis/operator",
    name="get_inspection_kpis_operator",
    response_model=OperatorInspectionKpisResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "operator"])
def get_inspection_kpis_operator(
    request: Request,
    period: Literal["custom", "today", "yesterday", "week", "month"] = Query(
        "custom",
        description=(
            "UTC date window: today, yesterday, this calendar week (Mon–today), "
            "this calendar month, or custom. For custom, omit both dates for last 7 days."
        ),
    ),
    date_from: date | None = Query(
        None,
        description="With period=custom: range start (UTC); omit both dates for last 7 days",
    ),
    date_to: date | None = Query(
        None,
        description="With period=custom: range end (UTC, inclusive); omit both dates for last 7 days",
    ),
    is_active: bool = Query(True),
    warehouse_uuid: uuid.UUID | None = Query(
        None,
        description="Optional filter by warehouse UUID (must be in the operator's scope)",
    ),
    plant_uuid: uuid.UUID | None = Query(
        None, description="Optional filter by plant UUID"
    ),
    db: Session = Depends(get_db),
):
    """Operator analytics KPIs: only inspections where the caller is ``inspector_id``."""
    try:
        date_from, date_to, period_norm = resolve_inspection_kpi_period(
            period, date_from, date_to
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, warehouse_uuid
    )
    _, plant_code = resolve_inspection_scope_filters(db, None, plant_uuid)
    inspector_user_id = int(request.state.user_id)
    payload = compute_operator_inspection_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_codes=warehouse_codes,
        inspector_user_id=inspector_user_id,
        plant_code=plant_code,
    )
    return OperatorInspectionKpisResponse(
        period=period_norm,
        date_from=date_from,
        date_to=date_to,
        review_queue=payload["review_queue"],
        inbound=OperatorInspectionDirectionKpis(**payload["inbound"]),
        outbound=OperatorInspectionDirectionKpis(**payload["outbound"]),
    )


@router.get(
    "/inspections",
    name="get_inspections",
    response_model=InspectionListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
@apply_operator_scope_filters
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
    inspector_scope_id = getattr(request.state, "inspector_scope_user_id", None)
    if inspector_scope_id is not None:
        query = query.filter(Inspection.inspector_id == inspector_scope_id)
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
@check_api_role(["superadmin", "manager", "operator"])
def parse_inspection_barcode(
    request: Request,
    barcode: str = Query(
        ...,
        description="16-character product barcode: 1-5 material, 6-7 compressor, 8-9 year, 10-11 week, 12-16 serial",
    ),
    db: Session = Depends(get_db),
):
    return build_barcode_parse_response(db, barcode)


@router.post(
    "/inspections/barcode-lock",
    name="acquire_inspection_barcode_lock",
    response_model=BarcodeLockResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def acquire_inspection_barcode_lock_route(
    request: Request,
    body: BarcodeLockAcquireRequest,
    db: Session = Depends(get_db),
):
    row = acquire_inspection_barcode_lock(
        db,
        int(request.state.user_id),
        body.barcode,
        body.inspection_type,
    )
    db.commit()
    return map_barcode_lock_row(row)


@router.post(
    "/inspections/barcode-lock/release",
    name="release_inspection_barcode_lock",
    response_model=BarcodeLockReleaseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def release_inspection_barcode_lock_route(
    request: Request,
    body: BarcodeLockAcquireRequest,
    db: Session = Depends(get_db),
):
    released = release_inspection_barcode_lock(
        db,
        int(request.state.user_id),
        body.barcode,
        body.inspection_type,
    )
    db.commit()
    return BarcodeLockReleaseResponse(released=released)


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


@router.get(
    "/inspections/metadata",
    name="get_inspection_metadata",
    response_model=InspectionMetadataResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def get_inspection_metadata(
    request: Request,
    db: Session = Depends(get_db),
):
    return build_inspection_metadata_response(db)


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


@router.post(
    "/inspections/outbound",
    name="start_outbound_inspection",
    response_model=InspectionWithChecklistPayload,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def start_outbound_inspection(
    request: Request,
    body: StartOutboundInspectionRequest,
    db: Session = Depends(get_db),
):
    return create_outbound_inspection(db, request, body)


@router.post(
    "/inspections/upload-image",
    name="upload_inspection_image",
    description=(
        "Upload a compressed image before an inspection exists; "
        "barcode is always 16 alphanumeric characters (product unit barcode). "
        "Returns a CDN-relative path under uploads/inspections/<barcode>/..."
    ),
    response_model=InspectionImageUploadResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
async def upload_inspection_image(
    request: Request,
    barcode: str = Form(
        ...,
        description="16-character alphanumeric product unit barcode (A-Z, a-z, 0-9)",
        min_length=16,
        max_length=16,
    ),
    direction: Literal["inbound", "outbound"] = Form(
        description="Workflow folder (inbound or outbound)",
    ),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    return save_inspection_image_upload(db, barcode, direction, raw, content_type)


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


@router.delete(
    "/inspections/{inspection_uuid}",
    name="delete_inspection",
    response_model=InspectionFullResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def delete_inspection(
    request: Request,
    inspection_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    return deactivate_inspection(db, inspection_uuid)


@router.get(
    "/inspections/{inspection_uuid}",
    name="get_inspection_detail",
    response_model=InspectionFullResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def get_inspection_detail(
    request: Request,
    inspection_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    inspection = get_inspection_entity_by_uuid(db, inspection_uuid)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if request_is_operator_only(request):
        uid = getattr(request.state, "user_id", None)
        if uid is None or inspection.inspector_id != int(uid):
            raise HTTPException(status_code=404, detail="Inspection not found")
    return present_inspection_full(inspection)
