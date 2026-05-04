"""Shared inspection + checklist (+ inputs) fetch and response mapping."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, joinedload

from mod.model import (
    Checklist,
    ChecklistFieldType,
    Inspection,
    InspectionImage,
    InspectionInput,
    InspectionType,
)
from utils.common import checklist_inspection_layer_key, parse_yes_no_outcome


def _enum_str(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: uuid.UUID
    sort_order: int
    group_name: str
    section: str
    item_text: str
    field_type: str
    dropdown_options: list[str] | None
    allows_remarks: bool
    photo_upload_rule: str
    min_upload_files: int
    is_active: bool


class InspectionInputItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: uuid.UUID
    checklist_id: int
    field: str
    value: str
    remarks: str
    is_active: bool
    image_urls: list[str]
    checklist: ChecklistItemResponse


class ChecklistLayerPassFail(BaseModel):
    pass_count: int = 0
    fail_count: int = 0
    image_urls: list[str] = Field(
        default_factory=list,
        description=(
            "Layer inspection photos as fully qualified URLs; set on full inspection "
            "responses, empty on parse-barcode and other lightweight payloads."
        ),
    )


class InspectionWithChecklistPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: uuid.UUID
    inspection_type: str
    inspector_id: int
    device_id: int
    device_uuid: uuid.UUID
    product_id: int
    product_unit_id: int
    warehouse_code: str | None
    plant_code: str | None
    dock_number: str | None
    damage_type: str | None
    damage_severity: str | None
    damage_cause: str | None
    damage_grade: str | None
    created_at: datetime
    updated_at: datetime
    inputs: list[InspectionInputItemResponse]
    outer_packaging_images: list[str]
    inner_packaging_images: list[str]
    product_images: list[str]
    outer_packaging_checks: ChecklistLayerPassFail
    inner_packaging_checks: ChecklistLayerPassFail
    product_checks: ChecklistLayerPassFail
    checklist_pass_total: int
    checklist_fail_total: int


def map_checklist_item(row: Checklist) -> ChecklistItemResponse:
    return ChecklistItemResponse(
        id=row.id,
        uuid=row.uuid,
        sort_order=row.sort_order,
        group_name=_enum_str(row.group_name),
        section=row.section,
        item_text=row.item_text,
        field_type=_enum_str(row.field_type),
        dropdown_options=row.dropdown_options,
        allows_remarks=bool(row.allows_remarks),
        photo_upload_rule=_enum_str(row.photo_upload_rule),
        min_upload_files=row.min_upload_files,
        is_active=bool(row.is_active),
    )


def map_inspection_input_item(
    inp: InspectionInput,
    image_urls: list[str],
) -> InspectionInputItemResponse:
    ch = inp.checklist
    if ch is None:
        raise ValueError("InspectionInput.checklist must be loaded (joinedload)")
    return InspectionInputItemResponse(
        id=inp.id,
        uuid=inp.uuid,
        checklist_id=inp.checklist_id,
        field=inp.field,
        value=inp.value,
        remarks=inp.remarks,
        is_active=bool(inp.is_active),
        image_urls=image_urls,
        checklist=map_checklist_item(ch),
    )


def map_inspection_with_checklist_inputs(
    inspection: Inspection,
) -> InspectionWithChecklistPayload:
    active_inputs = [i for i in (inspection.inputs or []) if i.is_active]
    active_images = [m for m in (inspection.images or []) if m.is_active]

    by_checklist_images: dict[int, list[str]] = {}
    outer_imgs: list[str] = []
    inner_imgs: list[str] = []
    product_imgs: list[str] = []

    o_y = o_n = i_y = i_n = p_y = p_n = 0
    pass_total = 0
    fail_total = 0

    yes_no_val = ChecklistFieldType.yes_no.value

    for img in active_images:
        if not img.image_url:
            continue
        cid = img.checklist_id
        if cid is not None:
            by_checklist_images.setdefault(cid, []).append(img.image_url)
        ch = img.checklist
        if ch is None:
            continue
        gname = (
            ch.group_name.value
            if hasattr(ch.group_name, "value")
            else str(ch.group_name)
        )
        layer = checklist_inspection_layer_key(gname)
        if layer == "outer":
            outer_imgs.append(img.image_url)
        elif layer == "inner":
            inner_imgs.append(img.image_url)
        elif layer == "product_checklist":
            product_imgs.append(img.image_url)

    for inp in active_inputs:
        ch = inp.checklist
        if ch is None:
            continue
        ft = ch.field_type
        ft_v = ft.value if hasattr(ft, "value") else str(ft)
        if ft_v != yes_no_val:
            continue
        gname = (
            ch.group_name.value
            if hasattr(ch.group_name, "value")
            else str(ch.group_name)
        )
        layer = checklist_inspection_layer_key(gname)
        outcome = parse_yes_no_outcome(inp.value)
        if outcome == "pass":
            pass_total += 1
            if layer == "outer":
                o_y += 1
            elif layer == "inner":
                i_y += 1
            elif layer == "product_checklist":
                p_y += 1
        elif outcome == "fail":
            fail_total += 1
            if layer == "outer":
                o_n += 1
            elif layer == "inner":
                i_n += 1
            elif layer == "product_checklist":
                p_n += 1

    mapped = [
        map_inspection_input_item(
            i, list(by_checklist_images.get(i.checklist_id, []))
        )
        for i in active_inputs
    ]
    for row in mapped:
        row.image_urls.sort()
    outer_imgs.sort()
    inner_imgs.sort()
    product_imgs.sort()
    mapped.sort(key=lambda x: (x.checklist.sort_order, x.checklist.id, x.id))
    dev = inspection.device
    return InspectionWithChecklistPayload(
        id=inspection.id,
        uuid=inspection.uuid,
        inspection_type=_enum_str(inspection.inspection_type),
        inspector_id=inspection.inspector_id,
        device_id=inspection.device_id,
        device_uuid=dev.uuid,
        product_id=inspection.product_id,
        product_unit_id=inspection.product_unit_id,
        warehouse_code=inspection.warehouse_code,
        plant_code=inspection.supplier_plant_code,
        dock_number=inspection.dock_number,
        damage_type=_enum_str(inspection.damage_type) if inspection.damage_type else None,
        damage_severity=_enum_str(inspection.damage_severity)
        if inspection.damage_severity
        else None,
        damage_cause=_enum_str(inspection.damage_likely_cause)
        if inspection.damage_likely_cause
        else None,
        damage_grade=_enum_str(inspection.damage_grading)
        if inspection.damage_grading
        else None,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        inputs=mapped,
        outer_packaging_images=outer_imgs,
        inner_packaging_images=inner_imgs,
        product_images=product_imgs,
        outer_packaging_checks=ChecklistLayerPassFail(pass_count=o_y, fail_count=o_n),
        inner_packaging_checks=ChecklistLayerPassFail(pass_count=i_y, fail_count=i_n),
        product_checks=ChecklistLayerPassFail(pass_count=p_y, fail_count=p_n),
        checklist_pass_total=pass_total,
        checklist_fail_total=fail_total,
    )


def fetch_inspections_for_product_unit(
    db: Session,
    product_unit_id: int,
    *,
    is_active: bool = True,
) -> list[Inspection]:
    """Load inspections for a unit with active inputs and their checklist rows."""
    return (
        db.query(Inspection)
        .options(
            joinedload(Inspection.device),
            joinedload(Inspection.inputs).joinedload(InspectionInput.checklist),
            joinedload(Inspection.images).joinedload(InspectionImage.checklist),
        )
        .filter(
            Inspection.product_unit_id == product_unit_id,
            Inspection.is_active.is_(is_active),
        )
        .order_by(Inspection.created_at.desc())
        .all()
    )


def latest_inbound_outbound_inspections(
    inspections: list[Inspection],
) -> tuple[Inspection | None, Inspection | None]:
    """From a list ordered newest-first, pick the latest inbound and latest outbound."""
    inbound_key = InspectionType.inbound.value
    outbound_key = InspectionType.outbound.value
    inbound: Inspection | None = None
    outbound: Inspection | None = None
    for row in inspections:
        tv = _enum_str(row.inspection_type)
        if tv == inbound_key and inbound is None:
            inbound = row
        elif tv == outbound_key and outbound is None:
            outbound = row
        if inbound is not None and outbound is not None:
            break
    return inbound, outbound


def map_latest_inbound_outbound_for_product_unit(
    db: Session,
    product_unit_id: int,
    *,
    is_active: bool = True,
) -> tuple[InspectionWithChecklistPayload | None, InspectionWithChecklistPayload | None]:
    """Fetch inspections for a product unit; return payloads for latest inbound and outbound."""
    rows = fetch_inspections_for_product_unit(
        db, product_unit_id, is_active=is_active
    )
    inb, outb = latest_inbound_outbound_inspections(rows)
    return (
        map_inspection_with_checklist_inputs(inb) if inb is not None else None,
        map_inspection_with_checklist_inputs(outb) if outb is not None else None,
    )
