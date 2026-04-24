import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.product_category.response import (
    ProductCategoryListResponse,
    ProductCategoryResponse,
)
from mod.model import ProductCategory
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Product Categories"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


def map_product_category(product_category: ProductCategory) -> ProductCategoryResponse:
    return ProductCategoryResponse(
        id=product_category.id,
        uuid=product_category.uuid,
        name=product_category.name,
        is_active=bool(product_category.is_active),
        created_at=product_category.created_at,
        updated_at=product_category.updated_at,
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
    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_product_category,
    )


@router.get("/product-categories/{product_category_uuid}", response_model=ProductCategoryResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_product_category(
    request: Request,
    product_category_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    product_category = (
        db.query(ProductCategory).filter(ProductCategory.uuid == product_category_uuid).first()
    )
    if product_category is None:
        raise HTTPException(status_code=404, detail="Product category not found")
    return map_product_category(product_category)
