import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.inspection.group_metrics import EMPTY_INSPECTION_BREAKDOWN
from mod.api.middleware import auth_dependency
from mod.api.product.helper import map_product, product_list_inspection_metrics
from mod.api.product.response import (
    ProductListItemResponse,
    ProductListResponse,
    ProductResponse,
)
from mod.model import Product, ProductCategory
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    get_pagination_params,
    paginate_query,
)

router = APIRouter(
    tags=["Products"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get("/products", response_model=ProductListResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_products(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Product)
        .join(ProductCategory, Product.product_category_id == ProductCategory.id)
        .options(joinedload(Product.product_category))
        .filter(Product.is_active.is_(is_active))
    )
    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Product.material_code, Product.material_description, ProductCategory.name],
        date_fields={"created_at": Product.created_at, "updated_at": Product.updated_at},
        sort_fields={
            "id": Product.id,
            "material_code": Product.material_code,
            "created_at": Product.created_at,
            "updated_at": Product.updated_at,
        },
        default_sort_field="id",
    )
    total = query.count()
    page = params.page if params.page >= 1 else 1
    per_page = params.per_page if params.per_page >= 1 else 1
    items: list[Product] = paginate_query(query, page=page, per_page=per_page).all()

    ids = [p.id for p in items]
    inspection_counts, inspection_breakdown = product_list_inspection_metrics(
        db, ids, is_active
    )

    base_rows = [map_product(p) for p in items]
    data = [
        ProductListItemResponse(
            **row.model_dump(),
            inspections_count=inspection_counts.get(p.id, 0),
            **(inspection_breakdown.get(p.id) or EMPTY_INSPECTION_BREAKDOWN),
        )
        for row, p in zip(base_rows, items, strict=True)
    ]

    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return ProductListResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/products/{product_uuid}", response_model=ProductResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product(
    request: Request,
    product_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(Product.uuid == product_uuid)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return map_product(product)
