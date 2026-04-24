"""Shared inspection + checklist (+ inputs) fetch and response mapping."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from mod.model import Checklist, Inspection, InspectionInput, InspectionType


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
    checklist: ChecklistItemResponse


class InspectionWithChecklistPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: uuid.UUID
    inspection_type: str
    inspector_id: int
    device_id: int
    product_id: int
    product_unit_id: int
    warehouse_code: str | None
    plant_code: str | None
    created_at: datetime
    updated_at: datetime
    inputs: list[InspectionInputItemResponse]


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


def map_inspection_input_item(inp: InspectionInput) -> InspectionInputItemResponse:
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
        checklist=map_checklist_item(ch),
    )


def map_inspection_with_checklist_inputs(
    inspection: Inspection,
) -> InspectionWithChecklistPayload:
    active_inputs = [i for i in (inspection.inputs or []) if i.is_active]
    mapped = [map_inspection_input_item(i) for i in active_inputs]
    mapped.sort(key=lambda x: (x.checklist.sort_order, x.checklist.id, x.id))
    return InspectionWithChecklistPayload(
        id=inspection.id,
        uuid=inspection.uuid,
        inspection_type=_enum_str(inspection.inspection_type),
        inspector_id=inspection.inspector_id,
        device_id=inspection.device_id,
        product_id=inspection.product_id,
        product_unit_id=inspection.product_unit_id,
        warehouse_code=inspection.warehouse_code,
        plant_code=inspection.supplier_plant_code,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        inputs=mapped,
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
            joinedload(Inspection.inputs).joinedload(InspectionInput.checklist),
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
