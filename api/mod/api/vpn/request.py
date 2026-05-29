from pydantic import BaseModel, EmailStr, Field


class VpnDeviceCreateRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=200)
    user_email: EmailStr
    device_name: str = Field(min_length=1, max_length=200)
    device_type: str = Field(min_length=1, max_length=64)
