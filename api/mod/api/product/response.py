import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    product_category_id: int
    product_category_name: str
    material_code: str
    material_description: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductListItemResponse(ProductResponse):
    inspections_count: int
    inspection_inbound_under_review: int
    inspection_outbound_under_review: int
    inspection_inbound_approved: int
    inspection_outbound_approved: int
    inspection_inbound_rejected: int
    inspection_outbound_rejected: int


class ProductListResponse(BaseModel):
    data: List[ProductListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
