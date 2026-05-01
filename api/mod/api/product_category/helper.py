import uuid

from fastapi import HTTPException
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from mod.api.product_category.response import (
    ProductCategoryInspectionResponse,
    ProductCategoryResponse,
)
from mod.model import (
    Inspection,
    InspectionReviewStatus,
    InspectionType,
    Product,
    ProductCategory,
)

EMPTY_INSPECTION_BREAKDOWN: dict[str, int] = {
    "inspection_inbound_under_review": 0,
    "inspection_outbound_under_review": 0,
    "inspection_inbound_approved": 0,
    "inspection_outbound_approved": 0,
    "inspection_inbound_rejected": 0,
    "inspection_outbound_rejected": 0,
}


def map_product_category(product_category: ProductCategory) -> ProductCategoryResponse:
    return ProductCategoryResponse(
        id=product_category.id,
        uuid=product_category.uuid,
        name=product_category.name,
        category_type=product_category.category_type,
        sub_category_type=product_category.sub_category_type,
        category_code=product_category.category_code,
        category_description=product_category.category_description,
        is_active=bool(product_category.is_active),
        created_at=product_category.created_at,
        updated_at=product_category.updated_at,
    )


def product_category_list_metrics(
    db: Session, category_ids: list[int], is_active: bool
) -> tuple[dict[int, int], dict[int, int], dict[int, dict[str, int]]]:
    if not category_ids:
        return {}, {}, {}
    pc_fk = Product.product_category_id
    product_counts = dict(
        db.query(pc_fk, func.count(Product.id))
        .filter(pc_fk.in_(category_ids), Product.is_active.is_(is_active))
        .group_by(pc_fk)
        .all()
    )
    inspection_counts = dict(
        db.query(Inspection.product_category_id, func.count(Inspection.id))
        .select_from(Inspection)
        .filter(
            Inspection.product_category_id.in_(category_ids),
            Inspection.is_active.is_(is_active),
        )
        .group_by(Inspection.product_category_id)
        .all()
    )
    inb = InspectionType.inbound
    out = InspectionType.outbound
    st = InspectionReviewStatus
    rows = (
        db.query(
            Inspection.product_category_id,
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
            Inspection.product_category_id.in_(category_ids),
            Inspection.is_active.is_(is_active),
        )
        .group_by(Inspection.product_category_id)
    )
    inspection_breakdown: dict[int, dict[str, int]] = {}
    for row in rows:
        inspection_breakdown[row.product_category_id] = {
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
    return product_counts, inspection_counts, inspection_breakdown


def get_product_category_or_404(
    db: Session, product_category_uuid: uuid.UUID
) -> ProductCategory:
    product_category = (
        db.query(ProductCategory).filter(ProductCategory.uuid == product_category_uuid).first()
    )
    if product_category is None:
        raise HTTPException(status_code=404, detail="Product category not found")
    return product_category


def map_product_category_inspection(inspection: Inspection) -> ProductCategoryInspectionResponse:
    inspector = inspection.inspector
    return ProductCategoryInspectionResponse(
        id=inspection.id,
        uuid=inspection.uuid,
        inspector_id=inspection.inspector_id,
        inspector_name=inspector.name if inspector else "",
        device_id=inspection.device_id,
        inspection_type=inspection.inspection_type.value
        if hasattr(inspection.inspection_type, "value")
        else str(inspection.inspection_type),
        product_id=inspection.product_id,
        warehouse_code=inspection.warehouse_code,
        plant_code=inspection.supplier_plant_code,
        created_at=inspection.created_at,
    )
