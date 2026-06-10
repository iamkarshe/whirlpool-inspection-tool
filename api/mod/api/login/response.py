import uuid
from datetime import datetime
from typing import Any, List

from pydantic import BaseModel, Field


class LoginIpMetadataResponse(BaseModel):
    country_code: str | None = None
    country_name: str | None = None
    region: str | None = None
    city: str | None = None
    isp: str | None = None
    lookup_status: str | None = Field(
        default=None,
        description="pending, completed, failed, or skipped",
    )


class LoginKpiResponse(BaseModel):
    total: int
    successful: int
    failed: int
    unique_users: int


class LoginListItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    reference_id: str
    user_name: str
    email: str | None
    attempted_email: str | None = None
    login_method: str | None = None
    failure_reason: str | None = None
    logged_at: datetime
    ip_address: str | None
    proxy_ip_address: str | None = None
    ip_metadata: LoginIpMetadataResponse | None = None
    device_source: str
    status: str


class LoginListResponse(BaseModel):
    data: List[LoginListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class LoginInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspection_type: str
    product_id: int
    created_at: datetime


class LoginDetailResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    reference_id: str
    user_name: str
    email: str | None
    attempted_email: str | None = None
    login_method: str | None = None
    failure_reason: str | None = None
    logged_at: datetime
    ip_address: str | None
    proxy_ip_address: str | None
    ip_metadata: LoginIpMetadataResponse | None = None
    device_source: str
    user_agent: str | None
    status: str
    device_info: Any
    inspections_done: int
    inspections: List[LoginInspectionResponse]
