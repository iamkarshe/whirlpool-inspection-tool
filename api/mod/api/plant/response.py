import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel


class PlantResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    plant_code: str
    name: str
    lat: float | None
    lng: float | None
    address: str
    city: str
    postal_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PlantListResponse(BaseModel):
    data: List[PlantResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
