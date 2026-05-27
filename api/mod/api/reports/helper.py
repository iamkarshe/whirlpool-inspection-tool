from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from mod.api.inspection.response import InspectionDropdownOption
from mod.api.reports.request import OperationsAnalyticsRequest
from mod.api.reports.response import KpiParametersResponse
from mod.model import (
    DamageGrading,
    Inspection,
    InspectionInput,
    InspectionInputReviewStatus,
    InspectionReviewStatus,
    InspectionType,
    Log,
    Plant,
    ProductCategory,
    Warehouse,
)
from utils.common import utc_end_exclusive_day_range


def build_kpi_parameters(db: Session) -> KpiParametersResponse:
    warehouse_rows = (
        db.query(Warehouse.id, Warehouse.warehouse_code, Warehouse.name)
        .filter(Warehouse.is_active.is_(True))
        .order_by(Warehouse.warehouse_code.asc())
        .all()
    )
    plant_rows = (
        db.query(Plant.id, Plant.plant_code, Plant.name)
        .filter(Plant.is_active.is_(True))
        .order_by(Plant.plant_code.asc())
        .all()
    )
    category_rows = (
        db.query(
            ProductCategory.id,
            ProductCategory.category_type,
            ProductCategory.sub_category_type,
        )
        .filter(ProductCategory.is_active.is_(True))
        .order_by(
            ProductCategory.category_type.asc(),
            ProductCategory.sub_category_type.asc(),
        )
        .all()
    )
    return KpiParametersResponse(
        warehouses=[
            InspectionDropdownOption(
                value=str(row.id),
                label=f"{row.warehouse_code} - {row.name}",
            )
            for row in warehouse_rows
        ],
        plants=[
            InspectionDropdownOption(
                value=str(row.id),
                label=f"{row.plant_code} - {row.name}",
            )
            for row in plant_rows
        ],
        product_category=[
            InspectionDropdownOption(
                value=str(row.id),
                label=f"{row.category_type} - {row.sub_category_type}",
            )
            for row in category_rows
        ],
        gradings=[
            InspectionDropdownOption(value=e.value, label=e.value)
            for e in DamageGrading
        ],
    )


def resolve_scope_codes(
    db: Session,
    warehouse_id: int | None,
    plant_id: int | None,
) -> tuple[str | None, str | None]:
    warehouse_code = None
    plant_code = None

    if warehouse_id is not None:
        warehouse_code = (
            db.query(Warehouse.warehouse_code)
            .filter(Warehouse.id == warehouse_id, Warehouse.is_active.is_(True))
            .scalar()
        )
        if warehouse_code is None:
            raise HTTPException(status_code=404, detail="Warehouse not found")

    if plant_id is not None:
        plant_code = (
            db.query(Plant.plant_code)
            .filter(Plant.id == plant_id, Plant.is_active.is_(True))
            .scalar()
        )
        if plant_code is None:
            raise HTTPException(status_code=404, detail="Plant not found")

    return warehouse_code, plant_code


def validate_analytics_date_range(
    date_from: date | None,
    date_to: date | None,
) -> None:
    if (date_from is None) ^ (date_to is None):
        raise HTTPException(
            status_code=400,
            detail="date_from and date_to must both be set or both omitted",
        )
    if date_from is not None and date_to is not None and date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )


def analytics_scope_from_request(
    db: Session,
    body: OperationsAnalyticsRequest,
) -> dict:
    return {
        "warehouse_codes": resolve_warehouse_codes(db, body.warehouse) or None,
        "product_category_ids": resolve_product_category_ids(db, body.product_category)
        or None,
        "inspection_type": body.inspection_type,
        "damage_grading": body.grading,
    }


def resolve_warehouse_codes(db: Session, warehouse_ids: list[int]) -> list[str]:
    if not warehouse_ids:
        return []
    unique_ids = list(dict.fromkeys(warehouse_ids))
    rows = (
        db.query(Warehouse.warehouse_code)
        .filter(Warehouse.id.in_(unique_ids), Warehouse.is_active.is_(True))
        .all()
    )
    if len(rows) != len(unique_ids):
        raise HTTPException(status_code=422, detail="Unknown warehouse id(s)")
    return [row.warehouse_code for row in rows]


def resolve_product_category_ids(db: Session, category_ids: list[int]) -> list[int]:
    if not category_ids:
        return []
    unique_ids = list(dict.fromkeys(category_ids))
    found = (
        db.query(ProductCategory.id)
        .filter(ProductCategory.id.in_(unique_ids), ProductCategory.is_active.is_(True))
        .count()
    )
    if found != len(unique_ids):
        raise HTTPException(status_code=422, detail="Unknown product category id(s)")
    return unique_ids


def inspection_analytics_filters(
    *,
    is_active: bool,
    date_from: date | None,
    date_to: date | None,
    warehouse_codes: list[str] | None,
    plant_codes: list[str] | None,
    product_category_ids: list[int] | None,
    inspection_type: InspectionType | None,
    damage_grading: DamageGrading | None,
) -> list:
    filters = [Inspection.is_active.is_(is_active)]
    if warehouse_codes:
        filters.append(Inspection.warehouse_code.in_(warehouse_codes))
    if plant_codes:
        filters.append(Inspection.supplier_plant_code.in_(plant_codes))
    if product_category_ids:
        filters.append(Inspection.product_category_id.in_(product_category_ids))
    if inspection_type is not None:
        filters.append(Inspection.inspection_type == inspection_type)
    if damage_grading is not None:
        filters.append(Inspection.damage_grading == damage_grading)
    if date_from is not None and date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(date_from, date_to)
        filters.extend(
            [Inspection.created_at >= start, Inspection.created_at < end_exclusive]
        )
    return filters


def damaged_inspection_condition():
    return or_(
        Inspection.damage_type.isnot(None),
        Inspection.damage_severity.isnot(None),
        Inspection.damage_grading.isnot(None),
    )


def executive_analytics_counts(
    db: Session,
    *,
    is_active: bool,
    date_from: date | None,
    date_to: date | None,
    warehouse_codes: list[str] | None,
    plant_codes: list[str] | None,
    product_category_ids: list[int] | None,
    inspection_type: InspectionType | None,
    damage_grading: DamageGrading | None,
) -> dict[str, int | float]:
    inspection_filters = inspection_analytics_filters(
        is_active=is_active,
        date_from=date_from,
        date_to=date_to,
        warehouse_codes=warehouse_codes,
        plant_codes=plant_codes,
        product_category_ids=product_category_ids,
        inspection_type=inspection_type,
        damage_grading=damage_grading,
    )
    damaged = damaged_inspection_condition()
    row = (
        db.query(
            func.count(Inspection.id).label("total"),
            func.sum(case((damaged, 1), else_=0)).label("damaged"),
            func.avg(
                case(
                    (Inspection.device_time_taken > 0, Inspection.device_time_taken),
                    else_=None,
                )
            ).label("avg_time_sec"),
            func.sum(
                case(
                    (
                        Inspection.review_status.in_(
                            [
                                InspectionReviewStatus.PENDING,
                                InspectionReviewStatus.IN_REVIEW,
                            ]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("pending"),
        )
        .filter(*inspection_filters)
        .one()
    )
    total = int(row.total or 0)
    damaged_count = int(row.damaged or 0)
    defect_rate_pct = (damaged_count / total * 100.0) if total > 0 else 0.0
    avg_sec = float(row.avg_time_sec or 0)
    return {
        "inspection_volume": total,
        "damaged_inspections": damaged_count,
        "defect_rate_pct": round(defect_rate_pct, 1),
        "avg_inspection_time_min": round(avg_sec / 60.0, 1),
        "pending_approvals": int(row.pending or 0),
    }


def operations_analytics_counts(
    db: Session,
    *,
    is_active: bool,
    date_from: date | None,
    date_to: date | None,
    warehouse_codes: list[str] | None,
    plant_codes: list[str] | None,
    product_category_ids: list[int] | None,
    inspection_type: InspectionType | None,
    damage_grading: DamageGrading | None,
) -> dict[str, int | float]:
    inspection_filters = inspection_analytics_filters(
        is_active=is_active,
        date_from=date_from,
        date_to=date_to,
        warehouse_codes=warehouse_codes,
        plant_codes=plant_codes,
        product_category_ids=product_category_ids,
        inspection_type=inspection_type,
        damage_grading=damage_grading,
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
                        [
                            InspectionReviewStatus.PENDING,
                            InspectionReviewStatus.IN_REVIEW,
                        ]
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("total_pending"),
        func.sum(
            case(
                (
                    and_(
                        Inspection.inspection_type == InspectionType.inbound,
                        Inspection.review_status == InspectionReviewStatus.APPROVED,
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
                        Inspection.inspection_type == InspectionType.inbound,
                        Inspection.review_status == InspectionReviewStatus.REJECTED,
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("inbound_failed"),
        func.sum(
            case(
                (
                    and_(
                        Inspection.inspection_type == InspectionType.inbound,
                        Inspection.review_status.in_(
                            [
                                InspectionReviewStatus.PENDING,
                                InspectionReviewStatus.IN_REVIEW,
                            ]
                        ),
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("inbound_pending"),
        func.sum(
            case(
                (
                    and_(
                        Inspection.inspection_type == InspectionType.outbound,
                        Inspection.review_status == InspectionReviewStatus.APPROVED,
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
                        Inspection.inspection_type == InspectionType.outbound,
                        Inspection.review_status == InspectionReviewStatus.REJECTED,
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("outbound_failed"),
        func.sum(
            case(
                (
                    and_(
                        Inspection.inspection_type == InspectionType.outbound,
                        Inspection.review_status.in_(
                            [
                                InspectionReviewStatus.PENDING,
                                InspectionReviewStatus.IN_REVIEW,
                            ]
                        ),
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("outbound_pending"),
    ).filter(*inspection_filters)
    inspection_row = inspection_agg.one()
    total = int(inspection_row.total or 0)
    total_inbound = int(inspection_row.total_inbound or 0)
    total_outbound = int(inspection_row.total_outbound or 0)
    total_approved = int(inspection_row.total_approved or 0)
    total_failed = int(inspection_row.total_failed or 0)
    total_pending = int(inspection_row.total_pending or 0)
    inbound_approved = int(inspection_row.inbound_approved or 0)
    inbound_failed = int(inspection_row.inbound_failed or 0)
    inbound_pending = int(inspection_row.inbound_pending or 0)
    outbound_approved = int(inspection_row.outbound_approved or 0)
    outbound_failed = int(inspection_row.outbound_failed or 0)
    outbound_pending = int(inspection_row.outbound_pending or 0)
    success_ratio = (total_approved / total) if total > 0 else 0.0
    failure_ratio = (total_failed / total) if total > 0 else 0.0

    flagged = (
        db.query(InspectionInput.inspection_id)
        .join(Inspection, Inspection.id == InspectionInput.inspection_id)
        .filter(
            InspectionInput.is_active.is_(is_active),
            InspectionInput.input_review_status == InspectionInputReviewStatus.FLAGGED,
            *inspection_filters,
        )
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
    unique_login_users = (
        login_query.filter(Log.user_id.isnot(None))
        .with_entities(Log.user_id)
        .distinct()
        .count()
    )

    return {
        "total": total,
        "total_inbound": total_inbound,
        "total_outbound": total_outbound,
        "total_approved": total_approved,
        "total_failed": total_failed,
        "total_pending": total_pending,
        "inbound_approved": inbound_approved,
        "inbound_failed": inbound_failed,
        "inbound_pending": inbound_pending,
        "outbound_approved": outbound_approved,
        "outbound_failed": outbound_failed,
        "outbound_pending": outbound_pending,
        "success_ratio": success_ratio,
        "failure_ratio": failure_ratio,
        "passed": total_approved,
        "in_review": total_pending,
        "flagged": flagged_count,
        "logins": logins,
        "unique_login_users": unique_login_users,
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
        inspections_base = inspections_base.filter(
            Inspection.warehouse_code == warehouse_code
        )
    if plant_code is not None:
        inspections_base = inspections_base.filter(
            Inspection.supplier_plant_code == plant_code
        )

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
        inspection_rows = inspection_rows.filter(
            Inspection.warehouse_code == warehouse_code
        )
    if plant_code is not None:
        inspection_rows = inspection_rows.filter(
            Inspection.supplier_plant_code == plant_code
        )
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
