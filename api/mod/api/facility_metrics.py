"""Aggregated inspection / device / user stats for a warehouse or plant (shared)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from mod.model import Inspection, InspectionReviewStatus, InspectionType


class FacilityStatsResponse(BaseModel):
    total_inspections: int
    devices_count: int
    users_count: int
    inbound_total: int
    inbound_in_review: int
    inbound_approved: int
    inbound_rejected: int
    outbound_total: int
    outbound_in_review: int
    outbound_approved: int
    outbound_rejected: int


def empty_facility_stats() -> FacilityStatsResponse:
    return FacilityStatsResponse(
        total_inspections=0,
        devices_count=0,
        users_count=0,
        inbound_total=0,
        inbound_in_review=0,
        inbound_approved=0,
        inbound_rejected=0,
        outbound_total=0,
        outbound_in_review=0,
        outbound_approved=0,
        outbound_rejected=0,
    )


def _breakdown_query(db: Session, group_col: Any, codes: list[str], is_active: bool):
    inb = InspectionType.inbound
    out = InspectionType.outbound
    st = InspectionReviewStatus
    g = group_col.label("code")
    return (
        db.query(
            g,
            func.count(Inspection.id).label("total_inspections"),
            func.count(func.distinct(Inspection.device_id)).label("devices_count"),
            func.count(func.distinct(Inspection.inspector_id)).label("users_count"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == inb,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("inbound_total"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == inb,
                            Inspection.review_status == st.IN_REVIEW,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("inbound_in_review"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == inb,
                            Inspection.review_status == st.APPROVED,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("inbound_approved"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == inb,
                            Inspection.review_status == st.REJECTED,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("inbound_rejected"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == out,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("outbound_total"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == out,
                            Inspection.review_status == st.IN_REVIEW,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("outbound_in_review"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == out,
                            Inspection.review_status == st.APPROVED,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("outbound_approved"),
            func.sum(
                case(
                    (
                        and_(
                            Inspection.inspection_type == out,
                            Inspection.review_status == st.REJECTED,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("outbound_rejected"),
        )
        .select_from(Inspection)
        .filter(group_col.in_(codes), Inspection.is_active.is_(is_active))
        .group_by(group_col)
    )


def _row_to_stats(row: Any) -> FacilityStatsResponse:
    return FacilityStatsResponse(
        total_inspections=int(row.total_inspections or 0),
        devices_count=int(row.devices_count or 0),
        users_count=int(row.users_count or 0),
        inbound_total=int(row.inbound_total or 0),
        inbound_in_review=int(row.inbound_in_review or 0),
        inbound_approved=int(row.inbound_approved or 0),
        inbound_rejected=int(row.inbound_rejected or 0),
        outbound_total=int(row.outbound_total or 0),
        outbound_in_review=int(row.outbound_in_review or 0),
        outbound_approved=int(row.outbound_approved or 0),
        outbound_rejected=int(row.outbound_rejected or 0),
    )


def facility_stats_for_warehouse(
    db: Session, warehouse_code: str, *, is_active: bool = True
) -> FacilityStatsResponse:
    return facility_stats_batch_by_warehouse_code(
        db, [warehouse_code], is_active=is_active
    ).get(warehouse_code, empty_facility_stats())


def facility_stats_for_plant(
    db: Session, plant_code: str, *, is_active: bool = True
) -> FacilityStatsResponse:
    return facility_stats_batch_by_plant_code(
        db, [plant_code], is_active=is_active
    ).get(plant_code, empty_facility_stats())


def facility_stats_batch_by_warehouse_code(
    db: Session, warehouse_codes: list[str], *, is_active: bool = True
) -> dict[str, FacilityStatsResponse]:
    if not warehouse_codes:
        return {}
    agg_rows = {
        r.code: r
        for r in _breakdown_query(
            db, Inspection.warehouse_code, warehouse_codes, is_active
        ).all()
    }
    out: dict[str, FacilityStatsResponse] = {}
    for code in warehouse_codes:
        row = agg_rows.get(code)
        if row is None:
            out[code] = empty_facility_stats()
        else:
            out[code] = _row_to_stats(row)
    return out


def facility_stats_batch_by_plant_code(
    db: Session, plant_codes: list[str], *, is_active: bool = True
) -> dict[str, FacilityStatsResponse]:
    if not plant_codes:
        return {}
    col = Inspection.supplier_plant_code
    agg_rows = {
        r.code: r for r in _breakdown_query(db, col, plant_codes, is_active).all()
    }
    out: dict[str, FacilityStatsResponse] = {}
    for code in plant_codes:
        row = agg_rows.get(code)
        if row is None:
            out[code] = empty_facility_stats()
        else:
            out[code] = _row_to_stats(row)
    return out
