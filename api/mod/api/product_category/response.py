import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel

from mod.api.product.response import ProductResponse


class ProductCategoryResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    category_type: str
    sub_category_type: str
    category_code: str
    category_description: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductCategoryListItemResponse(ProductCategoryResponse):
    products_count: int
    inspections_count: int


class ProductCategoryListResponse(BaseModel):
    data: List[ProductCategoryListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ProductCategoryProductsResponse(BaseModel):
    data: List[ProductResponse]


class ProductCategoryInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    inspection_type: str
    product_id: int
    checklist_id: int
    warehouse_code: str | None
    plant_code: str | None
    created_at: datetime


class ProductCategoryInspectionListResponse(BaseModel):
    data: List[ProductCategoryInspectionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
