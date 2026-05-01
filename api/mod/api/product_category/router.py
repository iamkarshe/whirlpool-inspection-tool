import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.api.product.router import map_product
from mod.api.product_category.helper import (
    EMPTY_INSPECTION_BREAKDOWN,
    get_product_category_or_404,
    map_product_category,
    map_product_category_inspection,
    product_category_list_metrics,
)
from mod.api.product_category.response import (
    ProductCategoryInspectionListResponse,
    ProductCategoryListItemResponse,
    ProductCategoryListResponse,
    ProductCategoryProductsResponse,
    ProductCategoryResponse,
)
from mod.model import Inspection, Product, ProductCategory
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
    paginate_query,
)

router = APIRouter(
    tags=["Product Categories"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get("/product-categories", response_model=ProductCategoryListResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product_categories(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    query = db.query(ProductCategory).filter(ProductCategory.is_active.is_(is_active))
    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[ProductCategory.name],
        date_fields={
            "created_at": ProductCategory.created_at,
            "updated_at": ProductCategory.updated_at,
        },
        sort_fields={
            "id": ProductCategory.id,
            "name": ProductCategory.name,
            "created_at": ProductCategory.created_at,
            "updated_at": ProductCategory.updated_at,
        },
        default_sort_field="id",
    )

    total = query.count()
    page = params.page if params.page >= 1 else 1
    per_page = params.per_page if params.per_page >= 1 else 1
    items: list[ProductCategory] = paginate_query(
        query, page=page, per_page=per_page
    ).all()

    ids = [c.id for c in items]
    product_counts, inspection_counts, inspection_breakdown = (
        product_category_list_metrics(db, ids, is_active)
    )

    base_rows = [map_product_category(c) for c in items]
    data = [
        ProductCategoryListItemResponse(
            **row.model_dump(),
            products_count=product_counts.get(c.id, 0),
            inspections_count=inspection_counts.get(c.id, 0),
            **(inspection_breakdown.get(c.id) or EMPTY_INSPECTION_BREAKDOWN),
        )
        for row, c in zip(base_rows, items, strict=True)
    ]

    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return ProductCategoryListResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get(
    "/product-categories/{product_category_uuid}/products",
    response_model=ProductCategoryProductsResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product_category_products(
    request: Request,
    product_category_uuid: uuid.UUID,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    category = get_product_category_or_404(db, product_category_uuid)
    products = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(
            Product.product_category_id == category.id,
            Product.is_active.is_(is_active),
        )
        .order_by(Product.id.asc())
        .all()
    )
    return ProductCategoryProductsResponse(data=[map_product(p) for p in products])


@router.get(
    "/product-categories/{product_category_uuid}/inspections",
    response_model=ProductCategoryInspectionListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product_category_inspections(
    request: Request,
    product_category_uuid: uuid.UUID,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    category = get_product_category_or_404(db, product_category_uuid)
    query = (
        db.query(Inspection)
        .join(Product, Inspection.product_id == Product.id)
        .filter(
            Inspection.product_category_id == category.id,
            Product.is_active.is_(is_active),
            Inspection.is_active.is_(is_active),
        )
        .options(
            joinedload(Inspection.inspector),
            joinedload(Inspection.product_unit),
        )
    )
    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Product.material_code, Product.material_description],
        date_fields={
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        sort_fields={
            "id": Inspection.id,
            "created_at": Inspection.created_at,
            "updated_at": Inspection.updated_at,
        },
        default_sort_field="id",
    )

    payload = build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_product_category_inspection,
    )
    return ProductCategoryInspectionListResponse(**payload)


@router.get(
    "/product-categories/{product_category_uuid}",
    response_model=ProductCategoryResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product_category(
    request: Request,
    product_category_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    return map_product_category(get_product_category_or_404(db, product_category_uuid))
