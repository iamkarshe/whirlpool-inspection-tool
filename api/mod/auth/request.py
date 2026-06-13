import uuid
from typing import Any, Dict

from pydantic import BaseModel, EmailStr, Field


class LoginDeviceInfo(BaseModel):
    imei: str = Field(min_length=3, max_length=48)
    device_type: str = Field(pattern="^(desktop|mobile)$")
    device_fingerprint: str = Field(min_length=10, max_length=255)
    device_info: Dict[str, Any] = Field(
        description="JSON object with device / browser info from PWA (userAgent, platform, etc.)"
    )
    current_lat: float | None = None
    current_lng: float | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    device: LoginDeviceInfo | None = None


class LoginTokenRequest(BaseModel):
    access_token: str = Field(
        min_length=10,
        description="Short-lived SSO exchange token from the Okta callback redirect",
    )
    device: LoginDeviceInfo | None = None


class ResolveDevicesRequest(BaseModel):
    keep_device_uuids: list[uuid.UUID] = Field(
        min_length=1,
        description="Device UUIDs to keep active; all other active devices are deregistered.",
    )


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=512)
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)
