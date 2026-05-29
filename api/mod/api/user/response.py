import uuid as uuid_std
from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr, Field

USER_RESPONSE_EXAMPLE = {
    "id": 3,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Devesh Verma",
    "email": "devesh@whirlpool.com",
    "mobile_number": "9000000003",
    "role": "manager",
    "designation": "Operations Manager",
    "is_active": True,
    "allowed_warehouse": ["WH01"],
    "allowed_plants": ["PL01"],
    "vpn_device_uuid": None,
    "vpn_device_name": None,
    "vpn_device_type": None,
    "vpn_provisioned_at": None,
}


class UserResponse(BaseModel):
    """User account returned by create, update, list, and VPN provision endpoints."""

    model_config = ConfigDict(json_schema_extra={"examples": [USER_RESPONSE_EXAMPLE]})

    id: int = Field(..., description="Internal numeric id.")
    uuid: uuid_std.UUID = Field(
        ...,
        description="Public user id. Use in paths such as /api/users/{user_uuid}.",
    )
    name: str = Field(..., description="Display name.")
    email: EmailStr = Field(..., description="Login email.")
    mobile_number: str = Field(..., description="Ten-digit mobile number.")
    role: str = Field(
        ...,
        description="Role slug: operator, manager, biz-admin, or superadmin.",
        examples=["manager"],
    )
    designation: str = Field(..., description="Job title.")
    is_active: bool = Field(
        ...,
        description="False means deactivated (cannot log in).",
    )
    allowed_warehouse: list[str] = Field(
        ...,
        description="Warehouse codes in scope. Empty for operators without warehouse access.",
        examples=[["WH01", "WH02"]],
    )
    allowed_plants: list[str] = Field(
        ...,
        description="Plant codes in scope.",
        examples=[["PL01"]],
    )
    vpn_device_uuid: uuid_std.UUID | None = Field(
        default=None,
        description="VPN provision device id when a profile exists.",
    )
    vpn_device_name: str | None = Field(
        default=None,
        description="VPN device label on the provision server.",
    )
    vpn_device_type: str | None = Field(
        default=None,
        description="VPN device type (for example android).",
    )
    vpn_provisioned_at: datetime | None = Field(
        default=None,
        description="UTC time when the current VPN profile was created.",
    )


class UserListResponse(BaseModel):
    """Paginated user list from GET /api/users."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "data": [USER_RESPONSE_EXAMPLE],
                    "total": 1,
                    "page": 1,
                    "per_page": 20,
                    "total_pages": 1,
                }
            ]
        }
    )

    data: List[UserResponse] = Field(..., description="Users on this page.")
    total: int = Field(..., description="Total rows matching filters.")
    page: int = Field(..., description="Current page (1-based).")
    per_page: int = Field(..., description="Page size.")
    total_pages: int = Field(..., description="Total number of pages.")
