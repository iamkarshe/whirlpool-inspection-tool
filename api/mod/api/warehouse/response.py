import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr


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


class WarehouseListResponse(BaseModel):
    data: List[WarehouseResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class WarehouseUserResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    email: EmailStr
    mobile_number: str
    designation: str
    is_active: bool


class WarehouseDeviceResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    user_id: int
    user_name: str
    imei: str
    device_type: str
    is_locked: bool
    is_active: bool


class WarehouseInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    inspection_type: str
    product_id: int
    checklist_id: int
    warehouse_code: str | None
    created_at: datetime


class WarehouseInfoResponse(BaseModel):
    warehouse: WarehouseResponse
    users: List[WarehouseUserResponse]
    devices: List[WarehouseDeviceResponse]
    inspections: List[WarehouseInspectionResponse]
