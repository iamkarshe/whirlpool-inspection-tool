import uuid
from datetime import datetime
from typing import Any, List

from pydantic import BaseModel


class DeviceResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    user_id: int
    user_name: str
    imei: str
    device_type: str
    device_fingerprint: str
    device_info: Any
    ip_address: str | None
    proxy_ip_address: str | None
    current_lat: float | None
    current_lng: float | None
    is_locked: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DeviceListResponse(BaseModel):
    data: List[DeviceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class DeviceKpiResponse(BaseModel):
    total: int
    active: int
    deleted: int
    locked: int
    unlocked: int
    desktop: int
    mobile: int


class DeviceInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    inspection_type: str
    product_id: int
    lat: float | None
    lng: float | None
    ip_address: str | None
    created_at: datetime
    updated_at: datetime


class DeviceInspectionListResponse(BaseModel):
    data: List[DeviceInspectionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
