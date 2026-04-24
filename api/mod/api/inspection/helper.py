from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.checklist_inspection import (
    map_latest_inbound_outbound_for_product_unit,
)
from mod.api.inspection.response import (
    BarcodeParseResponse,
    BarcodeParseSegments,
    BarcodeParseUnitResponse,
    InspectionDetailResponse,
    InspectionListItemResponse,
    InspectionPassFailCounts,
)
from mod.api.plant.helper import get_plant_by_uuid_or_404
from mod.api.product.router import map_product
from mod.api.product_category.helper import map_product_category
from mod.api.warehouse.helper import get_warehouse_by_uuid_or_404
from mod.model import (
    Checklist,
    ChecklistFieldType,
    ChecklistGroup,
    Inspection,
    InspectionInput,
    InspectionType,
    Product,
    ProductUnit,
)
from utils.common import (
    checklist_inspection_layer_key,
    device_display_label,
    empty_pass_fail_counts,
    parse_product_barcode_16,
    parse_yes_no_outcome,
    utc_end_exclusive_day_range,
)


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


def fetch_inspection_yes_no_metrics(db: Session, inspection_ids: list[int]) -> dict[int, dict[str, Any]]:
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
        ip_address=str(inspection.ip_address) if inspection.ip_address is not None else None,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
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
        inbound_payload, outbound_payload = map_latest_inbound_outbound_for_product_unit(
            db, unit.id
        )

    return BarcodeParseResponse(
        segments=BarcodeParseSegments(**fields),
        product_unit=product_unit_payload,
        product=map_product(product),
        product_category=map_product_category(category),
        inbound_inspection=inbound_payload,
        outbound_inspection=outbound_payload,
    )
