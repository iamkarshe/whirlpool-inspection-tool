from __future__ import annotations

import re
import uuid
from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.checklist_inspection import (
    ChecklistItemResponse,
    InspectionWithChecklistPayload,
    map_checklist_item,
    map_inspection_with_checklist_inputs,
    map_latest_inbound_outbound_for_product_unit,
)
from mod.api.inspection.response import (
    ActiveChecklistGroupedResponse,
    BarcodeParseResponse,
    BarcodeParseSegments,
    BarcodeParseUnitResponse,
    ChecklistGroupBlock,
    InspectionDetailResponse,
    InspectionFullResponse,
    InspectionImageUploadResponse,
    InspectionMetadataResponse,
    InspectionDropdownOption,
    InspectionListItemResponse,
    InspectionPassFailCounts,
    InspectionReviewHistoryItem,
    InspectionReviewStatusUpdateRequest,
    StartInboundInspectionRequest,
    StartOutboundInspectionRequest,
)
from mod.api.plant.helper import get_plant_by_uuid_or_404
from mod.api.product.helper import map_product
from mod.api.product_category.helper import map_product_category
from mod.api.warehouse.helper import get_warehouse_by_uuid_or_404
from mod.api.inspection.media import compress_image, upload_media
from mod.model import (
    Checklist,
    ChecklistFieldType,
    ChecklistGroup,
    ChecklistPhotoUploadRule,
    Device,
    Inspection,
    InspectionImage,
    InspectionInput,
    InspectionReviewEvent,
    InspectionReviewStatus,
    InspectionType,
    Plant,
    Product,
    ProductUnit,
    DamageGrading,
    DamageLikelyCause,
    DamageSeverity,
    DamageType,
    User,
    Warehouse,
)
from utils.common import (
    MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE,
    checklist_inspection_layer_key,
    device_display_label,
    empty_pass_fail_counts,
    haversine_distance_km,
    parse_product_barcode_16,
    parse_yes_no_outcome,
    utc_end_exclusive_day_range,
)
from utils.decorator import request_is_operator_only


def enforced_checklist_image_count(ch: Checklist, answer_value: str) -> int:
    """Minimum image URLs required for this row and answer (from photo_upload_rule + min_upload_files)."""
    min_n = int(ch.min_upload_files or 0)
    if min_n <= 0:
        return 0
    rule = ch.photo_upload_rule
    rule_v = rule.value if hasattr(rule, "value") else str(rule)
    if rule_v == ChecklistPhotoUploadRule.none.value:
        return 0
    if rule_v == ChecklistPhotoUploadRule.optional.value:
        return 0
    if rule_v == ChecklistPhotoUploadRule.always.value:
        return min_n
    if rule_v == ChecklistPhotoUploadRule.when_no.value:
        ft = ch.field_type
        ft_v = ft.value if hasattr(ft, "value") else str(ft)
        if ft_v != ChecklistFieldType.yes_no.value:
            return 0
        if parse_yes_no_outcome(answer_value) == "fail":
            return min_n
        return 0
    return 0


def resolve_inspection_scope_filters(
    db: Session,
    warehouse_uuid: uuid.UUID | None,
    plant_uuid: uuid.UUID | None,
) -> tuple[str | None, str | None]:
    warehouse_code: str | None = None
    plant_code: str | None = None
    if warehouse_uuid is not None:
        warehouse_code = get_warehouse_by_uuid_or_404(db, warehouse_uuid).warehouse_code
    if plant_uuid is not None:
        plant_code = get_plant_by_uuid_or_404(db, plant_uuid).plant_code
    return warehouse_code, plant_code


def _roles_from_request(request: Request) -> list[str]:
    role_raw = getattr(request.state, "role", None) or ""
    return [r.strip() for r in str(role_raw).split(",") if r.strip()]


def resolve_inspection_kpi_warehouse_codes(
    db: Session,
    request: Request,
    warehouse_uuid: uuid.UUID | None,
) -> list[str] | None:
    """Resolve warehouse filter for KPI endpoints.

    Returns ``None`` when the caller may see all warehouses (superadmin without
    ``warehouse_uuid``). Returns a non-empty list to restrict to those codes, or
    an empty list when the user has no assigned warehouses (all KPI counts zero).
    """
    roles = _roles_from_request(request)
    if "superadmin" in roles:
        if warehouse_uuid is None:
            return None
        return [get_warehouse_by_uuid_or_404(db, warehouse_uuid).warehouse_code]

    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = (
        db.query(User)
        .options(joinedload(User.warehouses_scope))
        .filter(User.id == int(user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    allowed = [w.warehouse_code for w in (user.warehouses_scope or [])]
    allowed_unique = list(dict.fromkeys(allowed))

    if warehouse_uuid is not None:
        code = get_warehouse_by_uuid_or_404(db, warehouse_uuid).warehouse_code
        if code not in set(allowed_unique):
            raise HTTPException(
                status_code=403,
                detail="Not allowed to view KPIs for this warehouse",
            )
        return [code]

    return allowed_unique


def compute_inspection_analytics_kpis(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    is_active: bool,
    warehouse_codes: list[str] | None,
    plant_code: str | None,
    user_id: int,
    operator_mode: bool,
    approvals_rejections_any_reviewer: bool = False,
) -> dict[str, int]:
    """Four headline counts for Data Analytics (see ``InspectionAnalyticsKpis``).

    When ``approvals_rejections_any_reviewer`` is true (typical superadmin), approved
    and rejected counts include every review decision in scope for the time window,
    not only rows where ``reviewer_id`` matches ``user_id``.
    """
    start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
    rst = InspectionReviewStatus
    pending_review = (rst.PENDING, rst.IN_REVIEW)

    def _scope_filters():
        conds = [
            Inspection.is_active.is_(is_active),
            Inspection.created_at >= start,
            Inspection.created_at < end_exclusive,
        ]
        if warehouse_codes is not None:
            conds.append(Inspection.warehouse_code.in_(warehouse_codes))
        if plant_code is not None:
            conds.append(Inspection.supplier_plant_code == plant_code)
        return conds

    def _count(*extra) -> int:
        return int(
            db.query(func.count(Inspection.id))
            .filter(*_scope_filters(), *extra)
            .scalar()
            or 0
        )

    if warehouse_codes is not None and len(warehouse_codes) == 0:
        return {
            "scans_total": 0,
            "scans_in_review": 0,
            "scans_approved": 0,
            "scans_rejected": 0,
        }

    if operator_mode:
        scans_total = _count(Inspection.inspector_id == int(user_id))
        scans_in_review = _count(
            Inspection.inspector_id == int(user_id),
            Inspection.review_status.in_(pending_review),
        )
        scans_approved = int(
            db.query(func.count(Inspection.id))
            .filter(
                Inspection.is_active.is_(is_active),
                Inspection.inspector_id == int(user_id),
                Inspection.review_status == rst.APPROVED,
                Inspection.reviewed_at.isnot(None),
                Inspection.reviewed_at >= start,
                Inspection.reviewed_at < end_exclusive,
                *(
                    [Inspection.warehouse_code.in_(warehouse_codes)]
                    if warehouse_codes is not None
                    else []
                ),
                *(
                    [Inspection.supplier_plant_code == plant_code]
                    if plant_code is not None
                    else []
                ),
            )
            .scalar()
            or 0
        )
        scans_rejected = int(
            db.query(func.count(Inspection.id))
            .filter(
                Inspection.is_active.is_(is_active),
                Inspection.inspector_id == int(user_id),
                Inspection.review_status == rst.REJECTED,
                Inspection.reviewed_at.isnot(None),
                Inspection.reviewed_at >= start,
                Inspection.reviewed_at < end_exclusive,
                *(
                    [Inspection.warehouse_code.in_(warehouse_codes)]
                    if warehouse_codes is not None
                    else []
                ),
                *(
                    [Inspection.supplier_plant_code == plant_code]
                    if plant_code is not None
                    else []
                ),
            )
            .scalar()
            or 0
        )
    else:
        scans_total = _count()
        scans_in_review = _count(Inspection.review_status.in_(pending_review))
        reviewer_clause_approved: list = []
        reviewer_clause_rejected: list = []
        if not approvals_rejections_any_reviewer:
            reviewer_clause_approved = [Inspection.reviewer_id == int(user_id)]
            reviewer_clause_rejected = [Inspection.reviewer_id == int(user_id)]
        scans_approved = int(
            db.query(func.count(Inspection.id))
            .filter(
                Inspection.is_active.is_(is_active),
                *reviewer_clause_approved,
                Inspection.review_status == rst.APPROVED,
                Inspection.reviewed_at.isnot(None),
                Inspection.reviewed_at >= start,
                Inspection.reviewed_at < end_exclusive,
                *(
                    [Inspection.warehouse_code.in_(warehouse_codes)]
                    if warehouse_codes is not None
                    else []
                ),
                *(
                    [Inspection.supplier_plant_code == plant_code]
                    if plant_code is not None
                    else []
                ),
            )
            .scalar()
            or 0
        )
        scans_rejected = int(
            db.query(func.count(Inspection.id))
            .filter(
                Inspection.is_active.is_(is_active),
                *reviewer_clause_rejected,
                Inspection.review_status == rst.REJECTED,
                Inspection.reviewed_at.isnot(None),
                Inspection.reviewed_at >= start,
                Inspection.reviewed_at < end_exclusive,
                *(
                    [Inspection.warehouse_code.in_(warehouse_codes)]
                    if warehouse_codes is not None
                    else []
                ),
                *(
                    [Inspection.supplier_plant_code == plant_code]
                    if plant_code is not None
                    else []
                ),
            )
            .scalar()
            or 0
        )

    return {
        "scans_total": scans_total,
        "scans_in_review": scans_in_review,
        "scans_approved": scans_approved,
        "scans_rejected": scans_rejected,
    }


def fetch_inspection_yes_no_metrics(
    db: Session, inspection_ids: list[int]
) -> dict[int, dict[str, Any]]:
    if not inspection_ids:
        return {}
    yes_no_value = ChecklistFieldType.yes_no.value
    rows = (
        db.query(
            InspectionInput.inspection_id,
            Checklist.group_name,
            InspectionInput.value,
        )
        .join(Checklist, InspectionInput.checklist_id == Checklist.id)
        .filter(
            InspectionInput.inspection_id.in_(inspection_ids),
            InspectionInput.is_active.is_(True),
            Checklist.field_type == yes_no_value,
        )
        .all()
    )
    state: dict[int, dict[str, Any]] = {
        iid: {
            "outer": empty_pass_fail_counts(),
            "inner": empty_pass_fail_counts(),
            "product_checklist": empty_pass_fail_counts(),
            "any_fail": False,
        }
        for iid in inspection_ids
    }
    for iid, group_name, raw_value in rows:
        group_label = (
            group_name.value
            if isinstance(group_name, ChecklistGroup)
            else str(group_name)
        )
        layer = checklist_inspection_layer_key(group_label)
        outcome = parse_yes_no_outcome(raw_value)
        if layer is None or outcome is None:
            continue
        if outcome == "fail":
            state[iid]["any_fail"] = True
            state[iid][layer]["fail"] += 1
        else:
            state[iid][layer]["pass"] += 1
    for iid in inspection_ids:
        state[iid]["passed"] = not state[iid]["any_fail"]
        del state[iid]["any_fail"]
    return state


def inspection_type_value(inspection: Inspection) -> str:
    t = inspection.inspection_type
    return t.value if hasattr(t, "value") else str(t)


def map_inspection_list_item(
    inspection: Inspection, metrics: dict[str, Any]
) -> InspectionListItemResponse:
    inspector = inspection.inspector
    reviewer = inspection.reviewer
    device = inspection.device
    product = inspection.product
    rs = inspection.review_status
    review_status_str = rs.value if hasattr(rs, "value") else str(rs)
    return InspectionListItemResponse(
        id=inspection.id,
        uuid=inspection.uuid,
        inspector_id=inspection.inspector_id,
        inspector_name=inspector.name if inspector else "",
        device_id=inspection.device_id,
        device_fingerprint=device_display_label(device),
        product_id=inspection.product_id,
        product_material_code=product.material_code if product else "",
        inspection_type=inspection_type_value(inspection),
        review_status=review_status_str,
        reviewer_id=inspection.reviewer_id,
        reviewer_name=reviewer.name if reviewer else None,
        reviewed_at=inspection.reviewed_at,
        warehouse_code=inspection.warehouse_code,
        plant_code=inspection.supplier_plant_code,
        outer=InspectionPassFailCounts(
            pass_count=metrics["outer"]["pass"],
            fail_count=metrics["outer"]["fail"],
        ),
        inner=InspectionPassFailCounts(
            pass_count=metrics["inner"]["pass"],
            fail_count=metrics["inner"]["fail"],
        ),
        product_checklist=InspectionPassFailCounts(
            pass_count=metrics["product_checklist"]["pass"],
            fail_count=metrics["product_checklist"]["fail"],
        ),
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
    )


def map_inspection_detail(inspection: Inspection) -> InspectionDetailResponse:
    inspector = inspection.inspector
    device = inspection.device
    product = inspection.product
    reviewer = inspection.reviewer
    rs = inspection.review_status
    review_status_str = rs.value if hasattr(rs, "value") else str(rs)
    events = sorted(
        inspection.review_events or [],
        key=lambda e: e.created_at,
        reverse=True,
    )
    review_history = [
        InspectionReviewHistoryItem(
            from_status=e.from_status.value if e.from_status is not None else None,
            to_status=e.to_status.value
            if hasattr(e.to_status, "value")
            else str(e.to_status),
            actor_user_id=e.actor_user_id,
            actor_name=e.actor.name if getattr(e, "actor", None) else "",
            comment=e.comment,
            created_at=e.created_at,
        )
        for e in events
    ]
    return InspectionDetailResponse(
        id=inspection.id,
        uuid=inspection.uuid,
        inspector_id=inspection.inspector_id,
        inspector_name=inspector.name if inspector else "",
        device_id=inspection.device_id,
        device_fingerprint=device_display_label(device),
        product_id=inspection.product_id,
        product_material_code=product.material_code if product else "",
        inspection_type=inspection_type_value(inspection),
        warehouse_code=inspection.warehouse_code,
        plant_code=inspection.supplier_plant_code,
        lat=inspection.lat,
        lng=inspection.lng,
        ip_address=str(inspection.ip_address)
        if inspection.ip_address is not None
        else None,
        review_status=review_status_str,
        is_under_review=bool(inspection.is_under_review),
        reviewer_id=inspection.reviewer_id,
        reviewer_name=reviewer.name if reviewer else None,
        reviewed_at=inspection.reviewed_at,
        reviewed_comment=inspection.reviewed_comment,
        review_history=review_history,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
    )


def update_inspection_review_status(
    db: Session,
    request: Request,
    inspection_uuid: uuid.UUID,
    body: InspectionReviewStatusUpdateRequest,
) -> InspectionFullResponse:
    inspection = (
        db.query(Inspection)
        .filter(Inspection.uuid == inspection_uuid)
        .with_for_update()
        .first()
    )
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")

    new_status = body.review_status
    if inspection.review_status == new_status:
        raise HTTPException(
            status_code=400,
            detail="Inspection already has this review_status",
        )
    actor_id = getattr(request.state, "user_id", None)
    if actor_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from_status_enum = inspection.review_status
    db.add(
        InspectionReviewEvent(
            inspection_id=inspection.id,
            from_status=from_status_enum,
            to_status=new_status,
            actor_user_id=int(actor_id),
            comment=body.comment,
        )
    )

    inspection.review_status = new_status
    inspection.reviewer_id = int(actor_id)
    if body.comment is not None:
        inspection.reviewed_comment = body.comment
    inspection.is_under_review = new_status in (
        InspectionReviewStatus.PENDING,
        InspectionReviewStatus.IN_REVIEW,
    )

    if new_status in (
        InspectionReviewStatus.APPROVED,
        InspectionReviewStatus.REJECTED,
    ):
        inspection.reviewed_at = datetime.now(timezone.utc)
    elif new_status in (
        InspectionReviewStatus.PENDING,
        InspectionReviewStatus.IN_REVIEW,
    ):
        inspection.reviewed_at = None

    db.commit()
    db.refresh(inspection)

    loaded = (
        apply_inspection_api_loads(db.query(Inspection))
        .filter(Inspection.id == inspection.id)
        .first()
    )
    if loaded is None:
        raise HTTPException(status_code=500, detail="Inspection reload failed")
    return present_inspection_full(loaded)


def deactivate_inspection(
    db: Session,
    inspection_uuid: uuid.UUID,
) -> InspectionFullResponse:
    inspection = (
        db.query(Inspection)
        .filter(Inspection.uuid == inspection_uuid)
        .with_for_update()
        .first()
    )
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if inspection.is_active is False:
        raise HTTPException(status_code=400, detail="Inspection is not active")

    inspection.is_active = False
    db.commit()

    loaded = (
        apply_inspection_api_loads(db.query(Inspection))
        .filter(Inspection.id == inspection.id)
        .first()
    )
    if loaded is None:
        raise HTTPException(status_code=500, detail="Inspection reload failed")
    return present_inspection_full(loaded)


def apply_inspection_api_loads(query):
    """Eager loads for inspection API payloads (detail + checklist/images)."""
    return query.options(
        joinedload(Inspection.inspector),
        joinedload(Inspection.reviewer),
        joinedload(Inspection.device),
        joinedload(Inspection.product),
        joinedload(Inspection.product_unit),
        joinedload(Inspection.review_events).joinedload(InspectionReviewEvent.actor),
        joinedload(Inspection.inputs).joinedload(InspectionInput.checklist),
        joinedload(Inspection.images).joinedload(InspectionImage.checklist),
    )


def get_inspection_entity_by_uuid(
    db: Session, inspection_uuid: uuid.UUID
) -> Inspection | None:
    return (
        apply_inspection_api_loads(db.query(Inspection))
        .filter(Inspection.uuid == inspection_uuid)
        .first()
    )


MAX_INSPECTION_IMAGE_BYTES = 12 * 1024 * 1024
ALLOWED_INSPECTION_IMAGE_MEDIA = frozenset({"image/jpeg", "image/png", "image/webp"})


INSPECTION_UPLOAD_BARCODE_LEN = 16
INSPECTION_UPLOAD_BARCODE_PATTERN = re.compile(
    rf"^[A-Za-z0-9]{{{INSPECTION_UPLOAD_BARCODE_LEN}}}$"
)


def sanitize_barcode_for_upload_path(barcode: str) -> str:
    s = barcode.strip()
    if not INSPECTION_UPLOAD_BARCODE_PATTERN.fullmatch(s):
        raise HTTPException(
            status_code=400,
            detail=(
                f"barcode must be exactly {INSPECTION_UPLOAD_BARCODE_LEN} "
                "alphanumeric characters (A-Z, a-z, 0-9)"
            ),
        )
    return s


def inspection_upload_relative_path(
    barcode: str,
    direction: str,
    *,
    file_uuid: uuid.UUID | None = None,
) -> str:
    fid = file_uuid or uuid.uuid4()
    return f"uploads/inspections/{barcode}/{direction}/{fid}.jpg"


def save_inspection_image_upload(
    db: Session,
    barcode: str,
    direction: Literal["inbound", "outbound"],
    raw_bytes: bytes,
    content_type: str,
) -> InspectionImageUploadResponse:
    safe_barcode = sanitize_barcode_for_upload_path(barcode)
    if (
        db.query(ProductUnit)
        .filter(
            ProductUnit.barcode == safe_barcode,
            ProductUnit.is_active.is_(True),
        )
        .first()
    ) is None:
        raise HTTPException(status_code=404, detail="Unknown barcode")

    ct = content_type.split(";")[0].strip().lower()
    if ct not in ALLOWED_INSPECTION_IMAGE_MEDIA:
        raise HTTPException(
            status_code=400,
            detail="File must be image/jpeg, image/png, or image/webp",
        )

    if len(raw_bytes) > MAX_INSPECTION_IMAGE_BYTES:
        mb = MAX_INSPECTION_IMAGE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Image too large (max {mb} MB)",
        )
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        jpeg_bytes = compress_image(raw_bytes)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Could not read or compress image",
        ) from None

    rel = inspection_upload_relative_path(
        safe_barcode, direction, file_uuid=uuid.uuid4()
    )
    try:
        path = upload_media(rel, jpeg_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return InspectionImageUploadResponse(path=path)


def present_inspection_full(inspection: Inspection) -> InspectionFullResponse:
    """Single place to build the full inspection row (detail + checklist parity)."""
    detail = map_inspection_detail(inspection)
    body = map_inspection_with_checklist_inputs(inspection)
    return InspectionFullResponse(
        **detail.model_dump(),
        product_unit_id=body.product_unit_id,
        inputs=body.inputs,
        outer_packaging_images=body.outer_packaging_images,
        inner_packaging_images=body.inner_packaging_images,
        product_images=body.product_images,
        outer_packaging_checks=body.outer_packaging_checks,
        inner_packaging_checks=body.inner_packaging_checks,
        product_checks=body.product_checks,
        checklist_pass_total=body.checklist_pass_total,
        checklist_fail_total=body.checklist_fail_total,
    )


def default_inspection_metrics() -> dict[str, Any]:
    return {
        "outer": empty_pass_fail_counts(),
        "inner": empty_pass_fail_counts(),
        "product_checklist": empty_pass_fail_counts(),
        "passed": True,
    }


def compute_inspection_kpis(
    db: Session,
    date_from: date,
    date_to: date,
    is_active: bool,
    warehouse_code: str | None = None,
    plant_code: str | None = None,
    warehouse_codes: list[str] | None = None,
    inspector_id: int | None = None,
) -> dict[str, int]:
    start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
    if warehouse_codes is not None and len(warehouse_codes) == 0:
        return {
            "total_inspections": 0,
            "inbound_in_review": 0,
            "inbound_approved": 0,
            "inbound_rejected": 0,
            "outbound_in_review": 0,
            "outbound_approved": 0,
            "outbound_rejected": 0,
        }
    query = db.query(
        Inspection.inspection_type,
        Inspection.review_status,
    ).filter(
        Inspection.is_active.is_(is_active),
        Inspection.created_at >= start,
        Inspection.created_at < end_exclusive,
    )
    if warehouse_codes is not None:
        query = query.filter(Inspection.warehouse_code.in_(warehouse_codes))
    elif warehouse_code is not None:
        query = query.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        query = query.filter(Inspection.supplier_plant_code == plant_code)
    if inspector_id is not None:
        query = query.filter(Inspection.inspector_id == inspector_id)
    inspections = query.all()
    inbound = InspectionType.inbound
    outbound = InspectionType.outbound
    rst = InspectionReviewStatus
    total = len(inspections)
    inbound_in_review = inbound_approved = inbound_rejected = 0
    outbound_in_review = outbound_approved = outbound_rejected = 0
    for insp_type, review_status in inspections:
        if insp_type == inbound:
            if review_status == rst.IN_REVIEW:
                inbound_in_review += 1
            elif review_status == rst.APPROVED:
                inbound_approved += 1
            elif review_status == rst.REJECTED:
                inbound_rejected += 1
        elif insp_type == outbound:
            if review_status == rst.IN_REVIEW:
                outbound_in_review += 1
            elif review_status == rst.APPROVED:
                outbound_approved += 1
            elif review_status == rst.REJECTED:
                outbound_rejected += 1
    return {
        "total_inspections": total,
        "inbound_in_review": inbound_in_review,
        "inbound_approved": inbound_approved,
        "inbound_rejected": inbound_rejected,
        "outbound_in_review": outbound_in_review,
        "outbound_approved": outbound_approved,
        "outbound_rejected": outbound_rejected,
    }


def build_barcode_parse_response(db: Session, barcode: str) -> BarcodeParseResponse:
    full_barcode = (barcode or "").strip()
    try:
        fields = parse_product_barcode_16(full_barcode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    material_code = fields["material_code"]
    unit = (
        db.query(ProductUnit)
        .options(
            joinedload(ProductUnit.product).joinedload(Product.product_category),
        )
        .filter(ProductUnit.barcode == full_barcode, ProductUnit.is_active.is_(True))
        .first()
    )

    product: Product | None = None
    if unit is not None:
        product = unit.product
        if product is None:
            raise HTTPException(status_code=404, detail="Product unit has no product")
    else:
        product = (
            db.query(Product)
            .options(joinedload(Product.product_category))
            .filter(
                Product.material_code == material_code,
                Product.is_active.is_(True),
            )
            .first()
        )
        if product is None:
            raise HTTPException(
                status_code=404,
                detail="No active product for this material code and no product unit for this barcode",
            )

    category = product.product_category
    if category is None:
        raise HTTPException(status_code=404, detail="Product has no category")

    product_unit_payload: BarcodeParseUnitResponse | None = None
    inbound_payload = outbound_payload = None
    if unit is not None:
        product_unit_payload = BarcodeParseUnitResponse(
            uuid=unit.uuid,
            barcode=unit.barcode,
            product_id=unit.product_id,
        )
        inbound_payload, outbound_payload = (
            map_latest_inbound_outbound_for_product_unit(db, unit.id)
        )

    return BarcodeParseResponse(
        segments=BarcodeParseSegments(**fields),
        product_unit=product_unit_payload,
        product=map_product(product),
        product_category=map_product_category(category),
        inbound_inspection=inbound_payload,
        outbound_inspection=outbound_payload,
    )


def build_active_checklist_grouped_response(
    db: Session,
) -> ActiveChecklistGroupedResponse:
    rows = (
        db.query(Checklist)
        .filter(Checklist.is_active.is_(True))
        .order_by(Checklist.sort_order)
        .all()
    )
    order_keys: list[str] = []
    buckets: dict[str, list[ChecklistItemResponse]] = {}
    for row in rows:
        key = (
            row.group_name.value
            if hasattr(row.group_name, "value")
            else str(row.group_name)
        )
        if key not in buckets:
            buckets[key] = []
            order_keys.append(key)
        buckets[key].append(map_checklist_item(row))
    groups = [ChecklistGroupBlock(group_name=k, items=buckets[k]) for k in order_keys]
    return ActiveChecklistGroupedResponse(groups=groups)


def build_inspection_metadata_response(db: Session) -> InspectionMetadataResponse:
    warehouses = (
        db.query(Warehouse)
        .filter(Warehouse.is_active.is_(True))
        .order_by(Warehouse.warehouse_code.asc())
        .all()
    )
    plants = (
        db.query(Plant)
        .filter(Plant.is_active.is_(True))
        .order_by(Plant.plant_code.asc())
        .all()
    )

    def to_label(value: str) -> str:
        return value.replace("_", " ").title()

    return InspectionMetadataResponse(
        inspection_types=[
            InspectionDropdownOption(value=e.value, label=to_label(e.value))
            for e in InspectionType
        ],
        warehouses=[
            InspectionDropdownOption(
                value=w.warehouse_code,
                label=f"{w.warehouse_code} - {w.name}",
            )
            for w in warehouses
        ],
        plants=[
            InspectionDropdownOption(
                value=p.plant_code,
                label=f"{p.plant_code} - {p.name}",
            )
            for p in plants
        ],
        damage_types=[
            InspectionDropdownOption(value=e.value, label=to_label(e.value))
            for e in DamageType
        ],
        damage_severities=[
            InspectionDropdownOption(value=e.value, label=to_label(e.value))
            for e in DamageSeverity
        ],
        damage_causes=[
            InspectionDropdownOption(value=e.value, label=to_label(e.value))
            for e in DamageLikelyCause
        ],
        damage_grades=[
            InspectionDropdownOption(value=e.value, label=e.value)
            for e in DamageGrading
        ],
        review_statuses=[
            InspectionDropdownOption(value=e.value, label=to_label(e.value))
            for e in InspectionReviewStatus
        ],
    )


def get_or_create_product_unit_for_barcode(
    db: Session,
    barcode: str,
) -> tuple[Product, ProductUnit, dict[str, str]]:
    full = (barcode or "").strip()
    try:
        fields = parse_product_barcode_16(full)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    material_code = fields["material_code"]
    product = (
        db.query(Product)
        .filter(Product.material_code == material_code, Product.is_active.is_(True))
        .first()
    )
    if product is None:
        raise HTTPException(
            status_code=404,
            detail="No active product for this barcode material code",
        )

    unit = db.query(ProductUnit).filter(ProductUnit.barcode == full).first()
    if unit is not None:
        if not unit.is_active:
            unit.is_active = True
        if unit.product_id != product.id:
            raise HTTPException(
                status_code=400,
                detail="This barcode is already registered to a different product",
            )
    else:
        unit = ProductUnit(
            uuid=uuid.uuid4(),
            product_id=product.id,
            barcode=full,
        )
        db.add(unit)

    db.flush()
    return product, unit, fields


def create_inspection(
    db: Session,
    request: Request,
    body: StartInboundInspectionRequest | StartOutboundInspectionRequest,
    inspection_type: InspectionType,
) -> InspectionWithChecklistPayload:
    committed = False
    try:
        full_barcode = body.barcode.strip()
        unit_row = (
            db.query(ProductUnit).filter(ProductUnit.barcode == full_barcode).first()
        )
        if unit_row is not None:
            duplicate = (
                db.query(Inspection)
                .filter(
                    Inspection.product_unit_id == unit_row.id,
                    Inspection.inspection_type == inspection_type,
                    Inspection.is_active.is_(True),
                )
                .first()
            )
            if duplicate is not None:
                inspection_type_text = (
                    inspection_type.value
                    if hasattr(inspection_type, "value")
                    else str(inspection_type)
                ).capitalize()
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": f"{inspection_type_text} already exists for this product unit",
                        "inspection_uuid": str(duplicate.uuid),
                    },
                )

        product, unit, fields = get_or_create_product_unit_for_barcode(db, body.barcode)

        device = (
            db.query(Device)
            .filter(Device.uuid == body.device_uuid, Device.is_active.is_(True))
            .first()
        )
        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")
        if device.user_id != request.state.user_id:
            raise HTTPException(
                status_code=403,
                detail="Device does not belong to the current user",
            )

        wh = (
            db.query(Warehouse)
            .filter(
                Warehouse.warehouse_code == body.warehouse_code,
                Warehouse.is_active.is_(True),
            )
            .first()
        )
        if wh is None:
            raise HTTPException(status_code=404, detail="Warehouse not found")

        if wh.lat is None or wh.lng is None:
            raise HTTPException(
                status_code=400,
                detail="Warehouse has no coordinates; cannot validate inspection location",
            )
        dist_km = haversine_distance_km(
            body.lat, body.lng, float(wh.lat), float(wh.lng)
        )
        if dist_km > MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Inspection location must be within 5 km of the selected warehouse.",
                    "distance_km": round(dist_km, 3),
                    "max_km": MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE,
                },
            )

        supplier_plant_code = body.supplier_plant_code
        if supplier_plant_code is not None:
            if (
                db.query(Plant)
                .filter(
                    Plant.plant_code == supplier_plant_code,
                    Plant.is_active.is_(True),
                )
                .first()
            ) is None:
                raise HTTPException(
                    status_code=404,
                    detail="Plant not found for supplier_plant_code",
                )

        checklist_rows = (
            db.query(Checklist)
            .filter(Checklist.is_active.is_(True))
            .order_by(Checklist.sort_order)
            .all()
        )
        sorted_rows = sorted(checklist_rows, key=lambda c: (c.sort_order, c.id))

        if not sorted_rows and body.checklist_answers:
            raise HTTPException(
                status_code=400,
                detail="No active checklist is configured; omit checklist answers",
            )
        if sorted_rows:
            if len(body.checklist_answers) != len(sorted_rows):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "checklist_answers must have one row per active checklist item, in checklist sort order",
                        "expected_count": len(sorted_rows),
                        "got_count": len(body.checklist_answers),
                    },
                )
            for idx, (ch, ans) in enumerate(zip(sorted_rows, body.checklist_answers)):
                if ans.id != ch.id:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "message": "checklist_answers[index].id must match the active checklist sequence (sort_order, then id)",
                            "index": idx,
                            "expected_checklist_id": ch.id,
                            "got_checklist_id": ans.id,
                        },
                    )
                required_images = enforced_checklist_image_count(ch, ans.value)
                n_img = len(ans.image_path)
                if n_img < required_images:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "message": "Not enough image URLs for this checklist row",
                            "checklist_id": ch.id,
                            "photo_upload_rule": ch.photo_upload_rule.value
                            if hasattr(ch.photo_upload_rule, "value")
                            else str(ch.photo_upload_rule),
                            "required_image_count": required_images,
                            "got_count": n_img,
                        },
                    )

        by_id = {c.id: c for c in checklist_rows}
        client_ip = request.client.host if request.client else None
        serial_number = fields["serial_number"]
        manufactured_year = 2000 + int(fields["manufacturing_year"])

        inspection = Inspection(
            uuid=uuid.uuid4(),
            inspector_id=request.state.user_id,
            device_id=device.id,
            inspection_type=inspection_type,
            product_unit_id=unit.id,
            product_id=product.id,
            product_category_id=product.product_category_id,
            warehouse_code=body.warehouse_code,
            supplier_plant_code=supplier_plant_code,
            lat=body.lat,
            lng=body.lng,
            serial_number=serial_number,
            manufactured_year=manufactured_year,
            truck_number=body.truck_number,
            dock_number=body.dock_number,
            truck_docking_time=body.truck_docking_time,
            damage_type=body.damage_type,
            damage_severity=body.damage_severity,
            damage_likely_cause=body.damage_cause,
            damage_grading=body.damage_grade,
            ip_address=client_ip,
            review_status=InspectionReviewStatus.IN_REVIEW,
            is_under_review=True,
        )
        db.add(inspection)
        db.flush()

        for ans in body.checklist_answers:
            ch = by_id[ans.id]
            remark_text = (ans.remarks or "").strip() or ""
            db.add(
                InspectionInput(
                    uuid=uuid.uuid4(),
                    product_id=product.id,
                    inspection_id=inspection.id,
                    checklist_id=ch.id,
                    field=(ch.item_text or "")[:512],
                    value=ans.value,
                    remarks=remark_text,
                )
            )
            for url in ans.image_path:
                image_url = str(url).strip()[:500]
                db.add(
                    InspectionImage(
                        uuid=uuid.uuid4(),
                        product_id=product.id,
                        inspection_id=inspection.id,
                        checklist_id=ch.id,
                        image_url=image_url,
                        remarks=remark_text,
                    )
                )

        db.commit()
        committed = True

        loaded = (
            db.query(Inspection)
            .options(
                joinedload(Inspection.inputs).joinedload(InspectionInput.checklist),
                joinedload(Inspection.images).joinedload(InspectionImage.checklist),
            )
            .filter(Inspection.id == inspection.id)
            .first()
        )
        if loaded is None:
            raise HTTPException(
                status_code=500, detail="Inspection could not be reloaded after create"
            )
        return map_inspection_with_checklist_inputs(loaded)
    except HTTPException as exc:
        if not committed:
            db.rollback()
        raise exc
    except Exception as exc:
        if not committed:
            db.rollback()
        raise exc


def create_inbound_inspection(
    db: Session,
    request: Request,
    body: StartInboundInspectionRequest,
) -> InspectionWithChecklistPayload:
    return create_inspection(db, request, body, InspectionType.inbound)


def create_outbound_inspection(
    db: Session,
    request: Request,
    body: StartOutboundInspectionRequest,
) -> InspectionWithChecklistPayload:
    return create_inspection(db, request, body, InspectionType.outbound)
