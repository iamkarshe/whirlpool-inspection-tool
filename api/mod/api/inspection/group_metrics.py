from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from mod.model import Inspection, InspectionReviewStatus, InspectionType

EMPTY_INSPECTION_BREAKDOWN: dict[str, int] = {
    "inspection_inbound_under_review": 0,
    "inspection_outbound_under_review": 0,
    "inspection_inbound_approved": 0,
    "inspection_outbound_approved": 0,
    "inspection_inbound_rejected": 0,
    "inspection_outbound_rejected": 0,
}


def inspection_totals_and_breakdown(
    db: Session,
    group_column,
    entity_ids: list[int],
    is_active: bool,
) -> tuple[dict[int, int], dict[int, dict[str, int]]]:
    if not entity_ids:
        return {}, {}
    inspection_counts = dict(
        db.query(group_column, func.count(Inspection.id))
        .select_from(Inspection)
        .filter(
            group_column.in_(entity_ids),
            Inspection.is_active.is_(is_active),
        )
        .group_by(group_column)
        .all()
    )
    inb = InspectionType.inbound
    out = InspectionType.outbound
    st = InspectionReviewStatus
    gk = group_column.label("entity_group_id")
    rows = (
        db.query(
            gk,
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
            ).label("inspection_inbound_under_review"),
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
            ).label("inspection_outbound_under_review"),
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
            ).label("inspection_inbound_approved"),
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
            ).label("inspection_outbound_approved"),
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
            ).label("inspection_inbound_rejected"),
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
            ).label("inspection_outbound_rejected"),
        )
        .filter(
            group_column.in_(entity_ids),
            Inspection.is_active.is_(is_active),
        )
        .group_by(group_column)
    )
    inspection_breakdown: dict[int, dict[str, int]] = {}
    for row in rows:
        inspection_breakdown[row.entity_group_id] = {
            "inspection_inbound_under_review": int(
                row.inspection_inbound_under_review or 0
            ),
            "inspection_outbound_under_review": int(
                row.inspection_outbound_under_review or 0
            ),
            "inspection_inbound_approved": int(row.inspection_inbound_approved or 0),
            "inspection_outbound_approved": int(
                row.inspection_outbound_approved or 0
            ),
            "inspection_inbound_rejected": int(row.inspection_inbound_rejected or 0),
            "inspection_outbound_rejected": int(
                row.inspection_outbound_rejected or 0
            ),
        }
    return inspection_counts, inspection_breakdown
