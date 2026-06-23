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
    must_change_password: bool = Field(
        default=False,
        description=(
            "True when the user must change their password (onboarding temp password "
            "or missing password_changed_at). Frontend should route to change-password."
        ),
    )
    password_expired: bool = Field(
        default=False,
        description=(
            "True when PASSWORD_MAX_AGE_DAYS elapsed since password_changed_at. "
            "Frontend should route to change-password."
        ),
    )
    change_password_otp_required: bool = Field(
        default=False,
        description=(
            "True when POST /auth/change-password requires an email OTP. "
            "False on first login (must_change_password); true after onboarding "
            "when CHANGE_PASSWORD_OTP_REQUIRED is enabled (default true)."
        ),
    )
    mfa_required: bool = Field(
        default=False,
        description=(
            "True when password/SSO verification succeeded but the user must submit "
            "a TOTP code via POST /auth/login/verify-2fa before receiving access_token."
        ),
    )
    mfa_setup_required: bool = Field(
        default=False,
        description=(
            "True when admin-enforced 2FA is enabled but the user has not enrolled yet. "
            "Call POST /auth/login/2fa/setup then POST /auth/login/verify-2fa."
        ),
    )
    mfa_pending_token: str | None = Field(
        default=None,
        description="Short-lived token for the second login step. Omitted when login is complete.",
    )
    two_factor_enabled: bool = Field(
        default=False,
        description="Whether TOTP two-factor authentication is active for this user.",
    )
    two_factor_enforced: bool = Field(
        default=False,
        description="Whether an administrator requires this user to use two-factor authentication.",
    )


class TwoFactorSetupStartResponse(BaseModel):
    secret_key: str = Field(
        description="Base32 secret for manual entry in an authenticator app.",
    )
    provisioning_uri: str = Field(
        description="otpauth:// URI for QR code generation in the UI.",
    )
    issuer: str = Field(description="Issuer label shown in the authenticator app.")


class TwoFactorStatusResponse(BaseModel):
    two_factor_enabled: bool
    two_factor_enforced: bool
    two_factor_setup_required: bool


class TwoFactorConfirmResponse(BaseModel):
    message: str = "Two-factor authentication enabled"
    two_factor_enabled: bool = True


class TwoFactorDisableResponse(BaseModel):
    message: str = "Two-factor authentication disabled"


class TwoFactorResetResponse(BaseModel):
    message: str = "Two-factor authentication reset for user"
    user_uuid: uuid.UUID


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


class ChangePasswordResponse(BaseModel):
    message: str = Field(
        description="Password was updated. User may access the application.",
        examples=["Password updated successfully"],
    )


class ChangePasswordOtpDebugResponse(BaseModel):
    otp_required: bool = Field(
        description="Dev-only: whether OTP is required for this user right now.",
    )
    email_sent: bool = Field(
        description="Dev-only: whether the OTP email was queued or sent.",
    )


class ChangePasswordOtpResponse(BaseModel):
    message: str = Field(
        description="Verification code request result.",
        examples=["Verification code sent to your email"],
    )
    otp_required: bool = Field(
        description="False when CHANGE_PASSWORD_*_OTP_REQUIRED is disabled for this user.",
    )
    expires_in_minutes: int = Field(
        description="OTP validity window in minutes.",
        examples=[10],
    )
    debug: ChangePasswordOtpDebugResponse | None = Field(
        default=None,
        description="Present when APP_ENV=dev.",
    )
