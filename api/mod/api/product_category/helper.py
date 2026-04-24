import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.api.product_category.response import (
    ProductCategoryInspectionResponse,
    ProductCategoryResponse,
)
from mod.model import Inspection, ProductCategory


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
