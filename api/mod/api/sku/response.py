import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel


class SkuResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    category: str
    sub_category: str
    category_code: str
    category_description: str
    material_code: str
    material_description: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SkuListResponse(BaseModel):
    data: List[SkuResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
