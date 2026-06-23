import uuid
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, EmailStr, Field


FORGOT_PASSWORD_REQUEST_EXAMPLE = {"email": "operator@whirlpool.com"}

RESET_PASSWORD_REQUEST_EXAMPLE = {
    "token": "",
    "password": "",
    "confirm_password": "",
}

LOGIN_VERIFY_2FA_REQUEST_EXAMPLE = {
    "mfa_pending_token": "",
    "totp_code": "123456",
}

LOGIN_2FA_SETUP_REQUEST_EXAMPLE = {
    "mfa_pending_token": "",
}

TWO_FACTOR_CONFIRM_REQUEST_EXAMPLE = {
    "totp_code": "123456",
}

TWO_FACTOR_DISABLE_REQUEST_EXAMPLE = {
    "totp_code": "123456",
}


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


class LoginVerifyTwoFactorRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [LOGIN_VERIFY_2FA_REQUEST_EXAMPLE]}
    )

    mfa_pending_token: str = Field(
        min_length=16,
        description="Token returned from POST /auth/login when mfa_required or mfa_setup_required is true.",
    )
    totp_code: str = Field(
        min_length=6,
        max_length=8,
        description="Six-digit code from the authenticator app.",
        examples=["123456"],
    )


class LoginTwoFactorSetupRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [LOGIN_2FA_SETUP_REQUEST_EXAMPLE]}
    )

    mfa_pending_token: str = Field(
        min_length=16,
        description="Token returned from POST /auth/login when mfa_setup_required is true.",
    )


class TwoFactorConfirmRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [TWO_FACTOR_CONFIRM_REQUEST_EXAMPLE]}
    )

    totp_code: str = Field(
        min_length=6,
        max_length=8,
        description="Six-digit code from the authenticator app.",
        examples=["123456"],
    )


class TwoFactorDisableRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [TWO_FACTOR_DISABLE_REQUEST_EXAMPLE]}
    )

    totp_code: str = Field(
        min_length=6,
        max_length=8,
        description="Current authenticator code required to disable 2FA.",
        examples=["123456"],
    )


class ForgotPasswordRequest(BaseModel):
    """Body for POST /auth/forgot-password."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [FORGOT_PASSWORD_REQUEST_EXAMPLE]}
    )

    email: EmailStr = Field(
        description="Account email. Superadmin accounts cannot use self-service reset.",
        examples=["operator@whirlpool.com"],
    )


class ResetPasswordRequest(BaseModel):
    """Body for POST /auth/reset-password."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [RESET_PASSWORD_REQUEST_EXAMPLE]}
    )

    token: str = Field(
        min_length=16,
        max_length=512,
        description="Plain reset token from the email magic link (`?token=` query param).",
        examples=["paste-token-from-email-link-query-param"],
    )
    password: str = Field(
        min_length=6,
        max_length=128,
        description="New password. Validated with zxcvbn (minimum score 3).",
        examples=[""],
    )
    confirm_password: str = Field(
        min_length=6,
        max_length=128,
        description="Must match `password` exactly.",
        examples=[""],
    )


CHANGE_PASSWORD_REQUEST_EXAMPLE = {
    "current_password": "",
    "new_password": "",
    "confirm_password": "",
    "otp_code": "",
}


class ChangePasswordRequest(BaseModel):
    """Body for POST /auth/change-password (authenticated)."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [CHANGE_PASSWORD_REQUEST_EXAMPLE]}
    )

    current_password: str = Field(
        min_length=6,
        max_length=128,
        description="Existing password (temporary password on first login).",
    )
    new_password: str = Field(
        min_length=6,
        max_length=128,
        description="New password. Validated with zxcvbn (minimum score 3).",
    )
    confirm_password: str = Field(
        min_length=6,
        max_length=128,
        description="Must match `new_password` exactly.",
    )
    otp_code: str | None = Field(
        default=None,
        min_length=4,
        max_length=12,
        description=(
            "Email verification code from POST /auth/change-password/request-otp. "
            "Required when CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED or "
            "CHANGE_PASSWORD_OTP_REQUIRED is enabled."
        ),
        examples=["123456"],
    )
