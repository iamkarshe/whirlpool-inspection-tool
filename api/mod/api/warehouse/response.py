import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel

from mod.api.facility_metrics import FacilityStatsResponse


class WarehouseResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    warehouse_code: str
    name: str
    lat: float | None
    lng: float | None
    address: str
    city: str
    postal_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    stats: FacilityStatsResponse


class WarehouseListResponse(BaseModel):
    data: List[WarehouseResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
