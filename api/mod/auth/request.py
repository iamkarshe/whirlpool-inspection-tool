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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
