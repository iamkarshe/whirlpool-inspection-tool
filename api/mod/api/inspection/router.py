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
from mod.api.inspection.request import (
    InspectionListQueryParams,
    InspectionScopeQueryParams,
    get_inspection_list_query_params,
    get_inspection_scope_query_params,
)
from mod.api.inspection.helper import (
    acquire_inspection_barcode_lock,
    apply_inspection_list_warehouse_scope,
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
    apply_inspection_scope_filters_to_query,
    resolve_inspection_kpi_warehouse_codes,
    resolve_inspection_scope_from_query,
    inspector_id_filter_clauses,
    validate_plant_filter_for_inspection_type,
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
from mod.model import Device, Inspection, InspectionType, Product, ProductUnit, User
from utils.common import resolve_inspection_kpi_period
from utils.db import get_db
from utils.decorator import (
    apply_operator_scope_filters,
    check_api_role,
    exception_handler_decorator,
    request_is_operator_only,
)
from utils.roles import (
    ROLES_INSPECTION,
    ROLES_INSPECTION_LEAD,
    assert_warehouse_code_in_request_scope,
    request_has_superadmin,
)
from utils.pagination import apply_standard_filters, paginate_query

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
@check_api_role(ROLES_INSPECTION)
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
    scope: InspectionScopeQueryParams = Depends(get_inspection_scope_query_params),
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
    scope_filters = resolve_inspection_scope_from_query(
        db,
        warehouse_ids=scope.warehouse_ids,
        plant_ids=scope.plant_ids,
        product_category=scope.product_category,
        user_ids=scope.user_ids,
    )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, scope.warehouse_ids
    )
    uid = int(request.state.user_id)
    operator_only = request_is_operator_only(request)
    superadmin = request_has_superadmin(request)
    inspector_ids = [uid] if operator_only else scope_filters["inspector_ids"]
    counts = compute_inspection_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_code=None,
        warehouse_codes=warehouse_codes,
        plant_codes=scope_filters["plant_codes"],
        product_category_pairs=scope_filters["product_category_pairs"],
        inspector_ids=inspector_ids,
    )
    analytics_counts = compute_inspection_analytics_kpis(
        db,
        date_from=date_from,
        date_to=date_to,
        is_active=is_active,
        warehouse_codes=warehouse_codes,
        plant_codes=scope_filters["plant_codes"],
        product_category_pairs=scope_filters["product_category_pairs"],
        inspector_ids=inspector_ids,
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
@check_api_role(ROLES_INSPECTION_LEAD)
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
    scope: InspectionScopeQueryParams = Depends(get_inspection_scope_query_params),
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
    scope_filters = resolve_inspection_scope_from_query(
        db,
        warehouse_ids=scope.warehouse_ids,
        plant_ids=scope.plant_ids,
        product_category=scope.product_category,
        user_ids=scope.user_ids,
    )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, scope.warehouse_ids
    )
    payload = compute_manager_inspection_team_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_codes=warehouse_codes,
        plant_codes=scope_filters["plant_codes"],
        product_category_pairs=scope_filters["product_category_pairs"],
        inspector_ids=scope_filters["inspector_ids"],
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
    scope: InspectionScopeQueryParams = Depends(get_inspection_scope_query_params),
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
    scope_filters = resolve_inspection_scope_from_query(
        db,
        warehouse_ids=scope.warehouse_ids,
        plant_ids=scope.plant_ids,
        product_category=scope.product_category,
    )
    warehouse_codes = resolve_inspection_kpi_warehouse_codes(
        db, request, scope.warehouse_ids
    )
    inspector_user_id = int(request.state.user_id)
    payload = compute_operator_inspection_kpis(
        db,
        date_from,
        date_to,
        is_active,
        warehouse_codes=warehouse_codes,
        inspector_user_id=inspector_user_id,
        plant_codes=scope_filters["plant_codes"],
        product_category_pairs=scope_filters["product_category_pairs"],
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
    summary="List inspections",
    description=(
        "Paginated list of inspections. Scope filters use values from "
        "GET /api/reports/kpi-parameters: warehouse_ids, plant_ids, "
        "product_category (pair keys), and user_ids (inspector ids)."
    ),
    response_model=InspectionListResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_INSPECTION)
@apply_operator_scope_filters
def get_inspections(
    request: Request,
    query_params: InspectionListQueryParams = Depends(get_inspection_list_query_params),
    db: Session = Depends(get_db),
):
    params = query_params.pagination_params()
    if (params.date_from is None) ^ (params.date_to is None):
        raise HTTPException(
            status_code=400,
            detail="date_from and date_to must both be set or both omitted",
        )
    if (
        params.date_from is not None
        and params.date_to is not None
        and params.date_to < params.date_from
    ):
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    filter_params = params
    if (
        params.date_from is not None
        and params.date_to is not None
        and params.date_field is None
    ):
        filter_params = params.model_copy(update={"date_field": "created_at"})
    validate_plant_filter_for_inspection_type(
        query_params.inspection_type, query_params.plant_ids
    )
    scope_filters = resolve_inspection_scope_from_query(
        db,
        warehouse_ids=query_params.warehouse_ids,
        plant_ids=query_params.plant_ids,
        product_category=query_params.product_category,
        user_ids=query_params.user_ids,
        inspection_type=query_params.inspection_type,
    )
    warehouse_codes = scope_filters["warehouse_codes"] or []
    query = (
        db.query(Inspection)
        .join(Product, Inspection.product_id == Product.id)
        .join(Device, Inspection.device_id == Device.id)
        .outerjoin(ProductUnit, Inspection.product_unit_id == ProductUnit.id)
        .outerjoin(User, Inspection.inspector_id == User.id)
        .options(
            joinedload(Inspection.inspector),
            joinedload(Inspection.reviewer),
            joinedload(Inspection.device),
            joinedload(Inspection.product),
            joinedload(Inspection.product_unit),
        )
        .filter(Inspection.is_active.is_(query_params.is_active))
    )
    inspector_scope_id = getattr(request.state, "inspector_scope_user_id", None)
    if inspector_scope_id is not None:
        query = query.filter(Inspection.inspector_id == inspector_scope_id)
    elif scope_filters["inspector_ids"]:
        for clause in inspector_id_filter_clauses(scope_filters["inspector_ids"]):
            query = query.filter(clause)
    query = apply_inspection_list_warehouse_scope(
        query, db, request, warehouse_codes or None
    )
    query = apply_inspection_scope_filters_to_query(
        query,
        db,
        plant_codes=scope_filters["plant_codes"],
        product_category_pairs=scope_filters["product_category_pairs"],
    )
    if query_params.inspection_type is not None:
        query = query.filter(
            Inspection.inspection_type == InspectionType(query_params.inspection_type)
        )

    query = apply_standard_filters(
        query=query,
        params=filter_params,
        search_columns=[
            ProductUnit.barcode,
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION)
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
        "Returns a stored path under uploads/inspections/<barcode>/... "
        "(local disk or S3 key depending on MEDIA_TYPE)."
    ),
    response_model=InspectionImageUploadResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_INSPECTION)
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
@check_api_role(ROLES_INSPECTION_LEAD)
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
@check_api_role(ROLES_INSPECTION)
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
    elif not request_has_superadmin(request):
        assert_warehouse_code_in_request_scope(db, request, inspection.warehouse_code)
    inbound_uuid: uuid.UUID | None = None
    outbound_uuid: uuid.UUID | None = None
    if inspection.product_unit_id is not None:
        rows = (
            db.query(Inspection.inspection_type, Inspection.uuid)
            .filter(
                Inspection.product_unit_id == inspection.product_unit_id,
                Inspection.is_active.is_(True),
            )
            .order_by(Inspection.created_at.desc())
            .all()
        )
        for inspection_type, inspection_uuid in rows:
            if inbound_uuid is None and inspection_type == InspectionType.inbound:
                inbound_uuid = inspection_uuid
            if outbound_uuid is None and inspection_type == InspectionType.outbound:
                outbound_uuid = inspection_uuid
            if inbound_uuid is not None and outbound_uuid is not None:
                break

    resp = present_inspection_full(inspection)
    return resp.model_copy(
        update={
            "inbound_inspection_uuid": inbound_uuid,
            "outbound_inspection_uuid": outbound_uuid,
        }
    )
