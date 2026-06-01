import enum

from pydantic import BaseModel, EmailStr, Field, field_validator


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
    username: str = Field(default="", max_length=512)
    password: str = Field(..., min_length=1, max_length=2048)
    from_email: EmailStr
    from_name: str = Field(default="", max_length=256)
    timeout_seconds: int = Field(default=30, ge=1, le=300)

    @field_validator("host", "username", "from_name", "password")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip()

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("Field must not be empty")
        return value
