import enum

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class SmtpProvider(str, enum.Enum):
    aws_ses = "aws_ses"
    google_workspace = "google_workspace"
    google_workspace_relay = "google_workspace_relay"
    custom_smtp = "custom_smtp"


class SmtpEncryption(str, enum.Enum):
    starttls = "starttls"
    ssl = "ssl"
    none = "none"


class OktaSsoUpdateRequest(BaseModel):
    okta_domain: str = Field(..., min_length=1, max_length=512)
    client_id: str = Field(..., min_length=1, max_length=512)
    redirect_uri: str = Field(..., min_length=1, max_length=1024)
    client_secret: str = Field(..., min_length=1, max_length=2048)

    @field_validator("okta_domain", "client_id", "redirect_uri", "client_secret")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field must not be empty")
        return stripped


class AwsS3UpdateRequest(BaseModel):
    bucket_name: str = Field(..., min_length=1, max_length=512)
    region: str = Field(..., min_length=1, max_length=128)
    access_key_id: str = Field(..., min_length=1, max_length=512)
    secret_access_key: str = Field(..., min_length=1, max_length=2048)

    @field_validator("bucket_name", "region", "access_key_id", "secret_access_key")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field must not be empty")
        return stripped


class SmtpUpdateRequest(BaseModel):
    provider: SmtpProvider
    host: str = Field(default="", max_length=512)
    port: int = Field(default=587, ge=1, le=65535)
    encryption: SmtpEncryption = SmtpEncryption.starttls
    auth_enabled: bool = Field(
        default=True,
        description="When false, SMTP login is skipped (internal relay / gateway).",
    )
    username: str = Field(default="", max_length=512)
    password: str = Field(default="", max_length=2048)
    from_email: EmailStr
    from_name: str = Field(default="", max_length=256)
    timeout_seconds: int = Field(default=30, ge=1, le=300)

    @field_validator("host", "username", "from_name", "password")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_auth_credentials(self) -> "SmtpUpdateRequest":
        if self.auth_enabled and not self.password:
            raise ValueError("password is required when auth_enabled is true")
        return self


class SmtpTestConnectionRequest(BaseModel):
    to_email: EmailStr = Field(
        ...,
        description="Recipient address for the test message.",
    )
    smtp: SmtpUpdateRequest | None = Field(
        None,
        description="Optional SMTP settings to test before saving; omit to use credentials.json.",
    )


class SmtpGatewayTestConnectionRequest(BaseModel):
    """
    Internal SMTP gateway test aligned with swaks:
    --port 25 --tls --tls-verify --from ... --to ... (no --auth-user).
    """

    host: str | None = Field(
        None,
        max_length=512,
        description="SMTP server (swaks --server). Omit to use saved smtp.host.",
    )
    port: int = Field(
        default=25,
        ge=1,
        le=65535,
        description="SMTP port (swaks --port 25).",
    )
    encryption: SmtpEncryption = Field(
        default=SmtpEncryption.starttls,
        description="Must be starttls (swaks --tls on port 25, not implicit SSL).",
    )
    tls_verify: bool = Field(
        default=True,
        description="Verify server TLS certificate (swaks --tls-verify).",
    )
    auth_enabled: bool = Field(
        default=False,
        description="Must be false; gateway does not use SMTP AUTH.",
    )
    to_email: EmailStr = Field(..., description="Recipient (swaks --to).")
    from_email: EmailStr | None = Field(
        None,
        description="Sender (swaks --from); omit to use saved smtp.from_email.",
    )
    from_name: str = Field(
        default="",
        max_length=256,
        description="Ignored for gateway test (swaks uses plain --from address only).",
    )
    ehlo_hostname: str | None = Field(
        None,
        max_length=512,
        description=(
            "Optional EHLO/HELO name (swaks --ehlo). "
            "Default: domain part of from_email."
        ),
    )
    timeout_seconds: int = Field(default=30, ge=1, le=300)

    @field_validator("host", "from_name", "ehlo_hostname")
    @classmethod
    def strip_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()
