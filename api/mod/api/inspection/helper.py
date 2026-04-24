from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from fastapi import HTTPException, Request
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
    InspectionListItemResponse,
    InspectionPassFailCounts,
    StartInboundInspectionRequest,
)
from mod.api.plant.helper import get_plant_by_uuid_or_404
from mod.api.product.router import map_product
from mod.api.product_category.helper import map_product_category
from mod.api.warehouse.helper import get_warehouse_by_uuid_or_404
from mod.model import (
    Checklist,
    ChecklistFieldType,
    ChecklistGroup,
    ChecklistPhotoUploadRule,
    Device,
    Inspection,
    InspectionImage,
    InspectionInput,
    InspectionType,
    Plant,
    Product,
    ProductUnit,
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
    device = inspection.device
    product = inspection.product
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
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
    )


def apply_inspection_api_loads(query):
    """Eager loads for inspection API payloads (detail + checklist/images)."""
    return query.options(
        joinedload(Inspection.inspector),
        joinedload(Inspection.device),
        joinedload(Inspection.product),
        joinedload(Inspection.product_unit),
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
) -> dict[str, int]:
    start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
    query = db.query(Inspection.id, Inspection.inspection_type).filter(
        Inspection.is_active.is_(is_active),
        Inspection.created_at >= start,
        Inspection.created_at < end_exclusive,
    )
    if warehouse_code is not None:
        query = query.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        query = query.filter(Inspection.supplier_plant_code == plant_code)
    inspections = query.all()
    ids = [row[0] for row in inspections]
    metrics = fetch_inspection_yes_no_metrics(db, ids)
    inbound = InspectionType.inbound.value
    outbound = InspectionType.outbound.value
    total = len(inspections)
    inbound_passed = inbound_failed = outbound_passed = outbound_failed = 0
    for iid, insp_type in inspections:
        t = insp_type.value if hasattr(insp_type, "value") else str(insp_type)
        passed = metrics.get(iid, default_inspection_metrics())["passed"]
        if t == inbound:
            if passed:
                inbound_passed += 1
            else:
                inbound_failed += 1
        elif t == outbound:
            if passed:
                outbound_passed += 1
            else:
                outbound_failed += 1
    return {
        "total_inspections": total,
        "inbound_passed": inbound_passed,
        "inbound_failed": inbound_failed,
        "outbound_passed": outbound_passed,
        "outbound_failed": outbound_failed,
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


def create_inbound_inspection(
    db: Session,
    request: Request,
    body: StartInboundInspectionRequest,
) -> InspectionWithChecklistPayload:
    committed = False
    try:
        full_barcode = body.barcode.strip()
        unit_row = (
            db.query(ProductUnit).filter(ProductUnit.barcode == full_barcode).first()
        )
        if unit_row is not None:
            dup_inbound = (
                db.query(Inspection)
                .filter(
                    Inspection.product_unit_id == unit_row.id,
                    Inspection.inspection_type == InspectionType.inbound,
                    Inspection.is_active.is_(True),
                )
                .first()
            )
            if dup_inbound is not None:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": "Inbound already exists for this product unit",
                        "inspection_uuid": str(dup_inbound.uuid),
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
                    "message": "Inspection location must be within 5 km of the selected warehouse",
                    "distance_km": round(dist_km, 3),
                    "max_km": MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE,
                },
            )

        if (
            db.query(Plant)
            .filter(
                Plant.plant_code == body.supplier_plant_code,
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
            inspection_type=InspectionType.inbound,
            product_unit_id=unit.id,
            product_id=product.id,
            product_category_id=product.product_category_id,
            warehouse_code=body.warehouse_code,
            supplier_plant_code=body.supplier_plant_code,
            lat=body.lat,
            lng=body.lng,
            serial_number=serial_number,
            manufactured_year=manufactured_year,
            truck_number=body.truck_number,
            dock_number=body.dock_number,
            truck_docking_time=body.truck_docking_time,
            ip_address=client_ip,
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
