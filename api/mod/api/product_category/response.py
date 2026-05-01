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
    inspection_inbound_under_review: int
    inspection_outbound_under_review: int
    inspection_inbound_approved: int
    inspection_outbound_approved: int
    inspection_inbound_rejected: int
    inspection_outbound_rejected: int


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
    warehouse_code: str | None
    plant_code: str | None
    created_at: datetime


class ProductCategoryInspectionListResponse(BaseModel):
    data: List[ProductCategoryInspectionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
