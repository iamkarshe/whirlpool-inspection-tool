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


class ProductListResponse(BaseModel):
    data: List[ProductResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
