import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HttpDetailErrorResponse(BaseModel):
    """Standard FastAPI HTTPException body (`detail` string)."""

    detail: str = Field(
        description="Human-readable error message for the UI.",
        examples=["Invalid or expired password reset link"],
    )


class AuthRequestValidationErrorResponse(BaseModel):
    """Body validation errors from the global RequestValidationError handler."""

    success: bool = Field(
        default=False,
        description="Always false for validation errors.",
        examples=[False],
    )
    error: str = Field(
        description="Summary error label.",
        examples=["Validation error"],
    )
    details: list[dict[str, Any]] = Field(
        description="Pydantic validation error objects (loc, msg, type, …).",
        examples=[
            [
                {
                    "type": "value_error",
                    "loc": ["body", "email"],
                    "msg": "value is not a valid email address",
                    "input": "not-an-email",
                }
            ]
        ],
    )


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


class ForgotPasswordDebugResponse(BaseModel):
    email_sent: bool = Field(
        description=(
            "True when a reset email was queued or sent. False when the account "
            "cannot reset (unknown, superadmin, inactive) or SMTP is unavailable."
        ),
    )
    is_disallowed: bool = Field(
        description=(
            "True when no reset token was issued and the verification flow was not "
            "started (superadmin, unknown user, inactive, invalid role)."
        ),
    )


class ForgotPasswordResponse(BaseModel):
    message: str = Field(
        description=(
            "Always returned for every request to avoid email enumeration. "
            "Check debug.email_sent / debug.is_disallowed in dev to inspect outcome."
        ),
        examples=["Password reset request accepted"],
    )
    debug: ForgotPasswordDebugResponse | None = Field(
        default=None,
        description=(
            "Dev-only diagnostic block (APP_ENV=dev). Omitted in production. "
            "Use email_sent and is_disallowed to drive UI toasts without leaking tokens."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "message": "Password reset request accepted",
                    "debug": {"email_sent": True, "is_disallowed": False},
                },
                {
                    "message": "Password reset request accepted",
                    "debug": {"email_sent": False, "is_disallowed": True},
                },
            ]
        }
    )


class ResetPasswordResponse(BaseModel):
    message: str = Field(
        description="Password was updated and all active sessions were revoked.",
        examples=["Password updated successfully"],
    )
