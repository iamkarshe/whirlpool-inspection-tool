import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ActiveDeviceResponse(BaseModel):
    uuid: uuid.UUID
    imei: str
    device_type: str
    device_fingerprint: str
    display_label: str
    is_current: bool = False
    has_active_session: bool = False
    last_seen_at: datetime | None = None


class ActiveDeviceListResponse(BaseModel):
    allow_multi_login: bool
    devices: list[ActiveDeviceResponse]


class LoginResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    email: EmailStr
    role: str
    designation: str
    is_active: bool
    access_token: str
    token_type: str = "bearer"
    device_uuid: uuid.UUID | None = None
    allowed_warehouses: list[str] | None = Field(
        default=None,
        description="Warehouse codes the user may access; null for superadmin.",
    )
    allow_multi_login: bool = True
    requires_device_selection: bool = False
    active_devices: list[ActiveDeviceResponse] = Field(default_factory=list)


class ResolveDevicesResponse(BaseModel):
    kept_device_uuids: list[uuid.UUID]
    deregistered_device_uuids: list[uuid.UUID]


class DeregisterDeviceResponse(BaseModel):
    device_uuid: uuid.UUID
    message: str = "Device deregistered and sessions revoked"


class ForgotPasswordResponse(BaseModel):
    message: str
