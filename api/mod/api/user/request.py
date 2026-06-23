import re
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

USER_CREATE_EXAMPLE = {
    "name": "Devesh Verma",
    "email": "devesh@whirlpool.com",
    "mobile_number": "9000000003",
    "password": "ChangeMe123",
    "role": "manager",
    "designation": "Operations Manager",
    "allowed_warehouse": ["WH01"],
    "allowed_plants": ["PL01"],
}

USER_UPDATE_EXAMPLE = {
    "name": "Devesh Verma",
    "designation": "Regional Manager",
    "allowed_warehouse": ["WH01", "WH02"],
}

USER_DEACTIVATE_EXAMPLE = {
    "is_active": False,
}

USER_GENERATE_VPN_EXAMPLE = {
    "user_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "device_name": "Devesh Laptop",
    "device_type": "android",
}

USER_CSV_HEADERS = (
    "Name",
    "Email",
    "Mobile",
    "Role",
    "Designation",
    "Allowed Warehouse",
)

USER_CSV_ROLE_VALUES = (
    "Admin (maps to biz-admin)",
    "Manager",
    "Operator",
)

USER_CSV_UPLOAD_FILE_DESCRIPTION = (
    "UTF-8 CSV file with header row. Required columns: "
    + ", ".join(USER_CSV_HEADERS)
    + ". Role must be one of: "
    + ", ".join(USER_CSV_ROLE_VALUES)
    + ". Allowed Warehouse is pipe-separated (for example RI52|RI62). "
    + "Superadmin cannot be imported. Extra columns are ignored."
)

USER_CSV_UPSERT_EXAMPLE = {
    "success": True,
    "created": 12,
    "updated": 4,
    "rejected": 1,
    "created_users": [
        {
            "row_number": 2,
            "email": "susanta_palit@whirlpool.in",
            "name": "Susanta Palit",
            "action": "created",
        }
    ],
    "updated_users": [
        {
            "row_number": 5,
            "email": "mohit_trivedi_kamalsons@whirlpool.in",
            "name": "Mohit Trivedi",
            "action": "updated",
        }
    ],
    "rejected_rows": [
        {
            "row_number": 8,
            "name": "Bad Row",
            "email": "bad@whirlpool.in",
            "mobile": "123",
            "role": "Operator",
            "designation": "Operator",
            "allowed_warehouse": "RI52",
            "reason": "Mobile must be exactly 10 digits",
        }
    ],
    "rejected_csv": "Name,Email,Mobile,Role,Designation,Allowed Warehouse,Error\\n...",
}


class UserCreateRequest(BaseModel):
    """Body for POST /api/users."""

    model_config = ConfigDict(json_schema_extra={"examples": [USER_CREATE_EXAMPLE]})

    name: str = Field(
        ...,
        min_length=2,
        max_length=120,
        description="Display name.",
        examples=["Devesh Verma"],
    )
    email: EmailStr = Field(
        ...,
        description="Login email. Stored lowercase.",
        examples=["devesh@whirlpool.com"],
    )
    mobile_number: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Ten-digit mobile number, unique across users.",
        examples=["9000000003"],
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Initial login password (hashed server-side).",
        examples=["ChangeMe123"],
    )
    role: Literal["operator", "manager", "biz-admin"] = Field(
        default="operator",
        description="App role. Superadmin cannot be assigned via this API.",
        examples=["manager"],
    )
    designation: str = Field(
        default="Operator",
        min_length=2,
        max_length=120,
        description="Job title shown in the UI.",
        examples=["Operations Manager"],
    )
    allowed_warehouse: list[str] = Field(
        default_factory=list,
        description="Warehouse codes the user may access. Required for manager and biz-admin.",
        examples=[["WH01", "WH02"]],
    )
    allowed_plants: list[str] = Field(
        default_factory=list,
        description="Plant codes the user may access (inbound scope).",
        examples=[["PL01"]],
    )


class UserUpdateRequest(BaseModel):
    """Body for PUT /api/users/{user_uuid}. Send only fields to change."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [USER_UPDATE_EXAMPLE, USER_DEACTIVATE_EXAMPLE],
        }
    )

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
        description="Display name.",
    )
    email: EmailStr | None = Field(
        default=None,
        description="Login email.",
    )
    mobile_number: str | None = Field(
        default=None,
        description="Ten-digit mobile number.",
        examples=["9000000003"],
    )
    password: str | None = Field(
        default=None,
        min_length=6,
        max_length=128,
        description="New login password.",
    )
    role: Literal["operator", "manager", "biz-admin"] | None = Field(
        default=None,
        description="App role. Superadmin cannot be assigned.",
    )
    designation: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
        description="Job title.",
    )
    is_active: bool | None = Field(
        default=None,
        description=(
            "Set false to deactivate the user (soft delete). "
            "Also revokes their VPN profile when VPN was provisioned."
        ),
        examples=[False],
    )
    allowed_warehouse: list[str] | None = Field(
        default=None,
        description="Replaces warehouse scope when provided. Omit to keep existing.",
        examples=[["WH01", "WH02"]],
    )
    allowed_plants: list[str] | None = Field(
        default=None,
        description="Replaces plant scope when provided. Omit to keep existing.",
    )
    two_factor_enforced: bool | None = Field(
        default=None,
        description=(
            "When true, the user must enroll in TOTP two-factor authentication. "
            "When false, removes the admin requirement (does not disable an existing enrollment)."
        ),
    )

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"\d{10}", value):
            raise ValueError("mobile_number must be exactly 10 digits")
        return value


class UserGenerateVpnRequest(BaseModel):
    """Body for POST /api/users/generate-vpn."""

    model_config = ConfigDict(json_schema_extra={"examples": [USER_GENERATE_VPN_EXAMPLE]})

    user_uuid: uuid.UUID = Field(
        ...,
        description="User to provision. One VPN profile per user.",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    device_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Label on the VPN server. Defaults to the user's name.",
        examples=["Devesh Laptop"],
    )
    device_type: str = Field(
        default="android",
        min_length=1,
        max_length=64,
        description="Device type sent to the VPN provision service.",
        examples=["android"],
    )
