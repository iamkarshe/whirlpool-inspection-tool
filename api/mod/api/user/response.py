import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    email: EmailStr
    mobile_number: str
    role: str
    designation: str
    is_active: bool
    allowed_warehouse: list[str]
    allowed_plants: list[str]
    vpn_device_uuid: uuid.UUID | None = None
    vpn_device_name: str | None = None
    vpn_device_type: str | None = None
    vpn_provisioned_at: datetime | None = None


class UserListResponse(BaseModel):
    data: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
