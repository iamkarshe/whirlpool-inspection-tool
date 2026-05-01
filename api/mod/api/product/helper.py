from sqlalchemy.orm import Session

from mod.api.inspection.group_metrics import inspection_totals_and_breakdown
from mod.api.product.response import ProductResponse
from mod.model import Inspection, Product


def map_product(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        uuid=product.uuid,
        product_category_id=product.product_category_id,
        product_category_name=product.product_category.name
        if product.product_category
        else "",
        material_code=product.material_code,
        material_description=product.material_description,
        is_active=bool(product.is_active),
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def product_list_inspection_metrics(
    db: Session, product_ids: list[int], is_active: bool
) -> tuple[dict[int, int], dict[int, dict[str, int]]]:
    return inspection_totals_and_breakdown(
        db, Inspection.product_id, product_ids, is_active
    )
