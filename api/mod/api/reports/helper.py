from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from mod.model import (
    Inspection,
    InspectionInput,
    InspectionInputReviewStatus,
    InspectionReviewStatus,
    InspectionType,
    Log,
    Plant,
    Warehouse,
)
from utils.common import utc_end_exclusive_day_range


def resolve_scope_codes(
    db: Session,
    warehouse_uuid,
    plant_uuid,
) -> tuple[str | None, str | None]:
    warehouse_code = None
    plant_code = None

    if warehouse_uuid is not None:
        warehouse = (
            db.query(Warehouse)
            .filter(Warehouse.uuid == warehouse_uuid, Warehouse.is_active.is_(True))
            .first()
        )
        if warehouse is None:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        warehouse_code = warehouse.warehouse_code

    if plant_uuid is not None:
        plant = (
            db.query(Plant)
            .filter(Plant.uuid == plant_uuid, Plant.is_active.is_(True))
            .first()
        )
        if plant is None:
            raise HTTPException(status_code=404, detail="Plant not found")
        plant_code = plant.plant_code

    return warehouse_code, plant_code


def operations_analytics_counts(
    db: Session,
    *,
    is_active: bool,
    date_from: date | None,
    date_to: date | None,
    warehouse_code: str | None,
    plant_code: str | None,
) -> dict[str, int | float]:
    inspection_filters = [Inspection.is_active.is_(is_active)]
    if warehouse_code is not None:
        inspection_filters.append(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        inspection_filters.append(Inspection.supplier_plant_code == plant_code)
    if date_from is not None and date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
        inspection_filters.extend(
            [Inspection.created_at >= start, Inspection.created_at < end_exclusive]
        )

    inspection_agg = db.query(
        func.count(Inspection.id).label("total"),
        func.sum(
            case((Inspection.inspection_type == InspectionType.inbound, 1), else_=0)
        ).label("total_inbound"),
        func.sum(
            case((Inspection.inspection_type == InspectionType.outbound, 1), else_=0)
        ).label("total_outbound"),
        func.sum(
            case(
                (Inspection.review_status == InspectionReviewStatus.APPROVED, 1),
                else_=0,
            )
        ).label("total_approved"),
        func.sum(
            case(
                (Inspection.review_status == InspectionReviewStatus.REJECTED, 1),
                else_=0,
            )
        ).label("total_failed"),
        func.sum(
            case(
                (
                    Inspection.review_status.in_(
                        [InspectionReviewStatus.PENDING, InspectionReviewStatus.IN_REVIEW]
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("total_pending"),
    ).filter(*inspection_filters)
    inspection_row = inspection_agg.one()
    total = int(inspection_row.total or 0)
    total_inbound = int(inspection_row.total_inbound or 0)
    total_outbound = int(inspection_row.total_outbound or 0)
    total_approved = int(inspection_row.total_approved or 0)
    total_failed = int(inspection_row.total_failed or 0)
    total_pending = int(inspection_row.total_pending or 0)
    success_ratio = (total_approved / total) if total > 0 else 0.0
    failure_ratio = (total_failed / total) if total > 0 else 0.0

    flagged = (
        db.query(InspectionInput.inspection_id)
        .join(Inspection, Inspection.id == InspectionInput.inspection_id)
        .filter(
            Inspection.is_active.is_(is_active),
            InspectionInput.is_active.is_(is_active),
            InspectionInput.input_review_status == InspectionInputReviewStatus.FLAGGED,
        )
    )
    if warehouse_code is not None:
        flagged = flagged.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        flagged = flagged.filter(Inspection.supplier_plant_code == plant_code)
    if date_from is not None and date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
        flagged = flagged.filter(
            Inspection.created_at >= start,
            Inspection.created_at < end_exclusive,
        )
    flagged_count = flagged.distinct().count()

    login_query = db.query(Log).filter(
        Log.is_active.is_(is_active),
        Log.log_value.ilike('%"event": "login"%'),
    )
    if date_from is not None and date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
        login_query = login_query.filter(
            Log.created_at >= start,
            Log.created_at < end_exclusive,
        )
    logins = login_query.count()

    return {
        "total": total,
        "total_inbound": total_inbound,
        "total_outbound": total_outbound,
        "total_approved": total_approved,
        "total_failed": total_failed,
        "total_pending": total_pending,
        "success_ratio": success_ratio,
        "failure_ratio": failure_ratio,
        "passed": total_approved,
        "in_review": total_pending,
        "flagged": flagged_count,
        "logins": logins,
    }


def operations_trend_data(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    is_active: bool,
    warehouse_code: str | None,
    plant_code: str | None,
) -> dict[str, list[dict] | date]:
    start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)

    inspections_base = db.query(Inspection).filter(
        Inspection.is_active.is_(is_active),
        Inspection.created_at >= start,
        Inspection.created_at < end_exclusive,
    )
    if warehouse_code is not None:
        inspections_base = inspections_base.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        inspections_base = inspections_base.filter(Inspection.supplier_plant_code == plant_code)

    warehouses = (
        db.query(Warehouse)
        .filter(Warehouse.is_active.is_(True))
        .order_by(Warehouse.warehouse_code.asc())
        .all()
    )
    if warehouse_code is not None:
        warehouses = [w for w in warehouses if w.warehouse_code == warehouse_code]

    inspection_rows = (
        db.query(
            Inspection.warehouse_code.label("warehouse_code"),
            func.count(Inspection.id).label("total"),
            func.sum(
                case(
                    (Inspection.review_status == InspectionReviewStatus.APPROVED, 1),
                    else_=0,
                )
            ).label("approved"),
        )
        .filter(
            Inspection.is_active.is_(is_active),
            Inspection.created_at >= start,
            Inspection.created_at < end_exclusive,
            Inspection.warehouse_code.isnot(None),
        )
        .group_by(Inspection.warehouse_code)
    )
    if warehouse_code is not None:
        inspection_rows = inspection_rows.filter(Inspection.warehouse_code == warehouse_code)
    if plant_code is not None:
        inspection_rows = inspection_rows.filter(Inspection.supplier_plant_code == plant_code)
    inspection_stats = {
        row.warehouse_code: {
            "total": int(row.total or 0),
            "approved": int(row.approved or 0),
        }
        for row in inspection_rows.all()
    }

    inspector_warehouse_subq = (
        db.query(
            Inspection.warehouse_code.label("warehouse_code"),
            Inspection.inspector_id.label("user_id"),
        )
        .filter(
            Inspection.is_active.is_(is_active),
            Inspection.created_at >= start,
            Inspection.created_at < end_exclusive,
            Inspection.warehouse_code.isnot(None),
            Inspection.inspector_id.isnot(None),
        )
        .distinct()
    )
    if warehouse_code is not None:
        inspector_warehouse_subq = inspector_warehouse_subq.filter(
            Inspection.warehouse_code == warehouse_code
        )
    if plant_code is not None:
        inspector_warehouse_subq = inspector_warehouse_subq.filter(
            Inspection.supplier_plant_code == plant_code
        )
    inspector_warehouse_subq = inspector_warehouse_subq.subquery()

    login_rows = (
        db.query(
            inspector_warehouse_subq.c.warehouse_code,
            func.count(Log.id).label("logins"),
        )
        .join(
            Log,
            and_(
                Log.user_id == inspector_warehouse_subq.c.user_id,
                Log.is_active.is_(is_active),
                Log.log_value.ilike('%"event": "login"%'),
                Log.created_at >= start,
                Log.created_at < end_exclusive,
            ),
        )
        .group_by(inspector_warehouse_subq.c.warehouse_code)
        .all()
    )
    login_stats = {row.warehouse_code: int(row.logins or 0) for row in login_rows}

    by_warehouse: list[dict] = []
    for wh in warehouses:
        wh_total = inspection_stats.get(wh.warehouse_code, {}).get("total", 0)
        wh_approved = inspection_stats.get(wh.warehouse_code, {}).get("approved", 0)
        by_warehouse.append(
            {
                "warehouse_code": wh.warehouse_code,
                "warehouse_name": wh.name,
                "inspections": wh_total,
                "logins": login_stats.get(wh.warehouse_code, 0),
                "success_ratio": (wh_approved / wh_total) if wh_total > 0 else 0.0,
            }
        )

    weekly_trend: list[dict] = []
    bucket_start = date_from
    index = 1
    while bucket_start <= date_to:
        bucket_end = min(bucket_start + timedelta(days=6), date_to)
        b_start, b_end_exclusive = utc_end_exclusive_day_range(bucket_start, bucket_end)
        b_query = inspections_base.filter(
            Inspection.created_at >= b_start,
            Inspection.created_at < b_end_exclusive,
        )
        b_total = b_query.count()
        b_approved = b_query.filter(
            Inspection.review_status == InspectionReviewStatus.APPROVED
        ).count()
        b_logins = (
            db.query(Log)
            .filter(
                Log.is_active.is_(is_active),
                Log.log_value.ilike('%"event": "login"%'),
                Log.created_at >= b_start,
                Log.created_at < b_end_exclusive,
            )
            .count()
        )
        weekly_trend.append(
            {
                "label": f"W{index}",
                "date_from": bucket_start,
                "date_to": bucket_end,
                "inspections": b_total,
                "logins": b_logins,
                "success_ratio": (b_approved / b_total) if b_total > 0 else 0.0,
            }
        )
        index += 1
        bucket_start = bucket_end + timedelta(days=1)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "by_warehouse": by_warehouse,
        "weekly_trend": weekly_trend,
    }
