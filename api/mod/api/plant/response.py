import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr


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


class PlantUserResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    email: EmailStr
    mobile_number: str
    designation: str
    is_active: bool


class PlantDeviceResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    user_id: int
    user_name: str
    imei: str
    device_type: str
    is_locked: bool
    is_active: bool


class PlantInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    inspection_type: str
    product_id: int
    checklist_id: int
    plant_code: str | None
    created_at: datetime


class PlantInfoResponse(BaseModel):
    plant: PlantResponse
    users: List[PlantUserResponse]
    devices: List[PlantDeviceResponse]
    inspections: List[PlantInspectionResponse]
