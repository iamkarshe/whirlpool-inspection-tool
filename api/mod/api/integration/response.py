from pydantic import BaseModel


class OktaSsoCredentialsResponse(BaseModel):
    okta_domain: str
    client_id: str
    redirect_uri: str
    client_secret: str


class AwsS3CredentialsResponse(BaseModel):
    bucket_name: str
    region: str
    access_key_id: str
    secret_access_key: str


class IntegrationCredentialsResponse(BaseModel):
    okta_sso: OktaSsoCredentialsResponse
    aws_s3: AwsS3CredentialsResponse
