import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.api.product.response import ProductListResponse, ProductResponse
from mod.model import Product, ProductCategory
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Products"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


def map_product(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        uuid=product.uuid,
        product_category_id=product.product_category_id,
        product_category_name=product.product_category.name if product.product_category else "",
        material_code=product.material_code,
        material_description=product.material_description,
        is_active=bool(product.is_active),
        created_at=product.created_at,
        updated_at=product.updated_at,
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
    return build_paginated_response(query=query, page=params.page, per_page=params.per_page, mapper=map_product)


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
