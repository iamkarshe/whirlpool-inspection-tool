from pydantic import BaseModel, Field, field_validator


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
