from pydantic import BaseModel, Field


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


class IntegrationCredentialsResponse(BaseModel):
    okta_sso: OktaSsoCredentialsResponse
    aws_s3: AwsS3CredentialsResponse


class AwsS3TestConnectionResponse(BaseModel):
    success: bool
    message: str
    bucket_name: str | None = None
    region: str | None = None
