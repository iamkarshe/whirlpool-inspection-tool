from pydantic import BaseModel, Field

from mod.api.integration.request import SmtpEncryption, SmtpProvider


class OktaSsoCredentialsResponse(BaseModel):
    okta_domain: str = Field(..., min_length=1, max_length=512)
    client_id: str = Field(..., min_length=1, max_length=512)
    redirect_uri: str = Field(..., min_length=1, max_length=1024)
    client_secret: str = Field(..., min_length=1, max_length=2048)


class AwsS3CredentialsResponse(BaseModel):
    bucket_name: str = Field(..., min_length=1, max_length=512)
    region: str = Field(..., min_length=1, max_length=512)
    access_key_id: str = Field(..., min_length=1, max_length=512)
    secret_access_key: str = Field(..., min_length=1, max_length=2048)


class SmtpCredentialsResponse(BaseModel):
    provider: SmtpProvider | None = Field(
        None,
        description=(
            "SMTP provider: aws_ses, google_workspace, "
            "google_workspace_relay, or custom_smtp."
        ),
    )
    host: str = ""
    port: int = Field(587, ge=1, le=65535)
    encryption: SmtpEncryption | str = SmtpEncryption.starttls
    username: str = ""
    password: str = Field(
        "",
        description="Masked SMTP password (****** when configured).",
    )
    from_email: str = ""
    from_name: str = ""
    timeout_seconds: int = Field(30, ge=1, le=300)


class IntegrationCredentialsResponse(BaseModel):
    okta_sso: OktaSsoCredentialsResponse
    aws_s3: AwsS3CredentialsResponse
    smtp: SmtpCredentialsResponse


class AwsS3TestConnectionResponse(BaseModel):
    success: bool
    message: str
    bucket_name: str | None = None
    region: str | None = None


class SmtpTestConnectionResponse(BaseModel):
    success: bool
    message: str
    error_trace: str | None = Field(
        None,
        description="Full Python traceback when success is false.",
    )
    provider: SmtpProvider | None = None
    host: str | None = None
    port: int | None = None
    to_email: str | None = None
