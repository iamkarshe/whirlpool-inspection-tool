import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel


class ProductCategoryResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductCategoryListResponse(BaseModel):
    data: List[ProductCategoryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
