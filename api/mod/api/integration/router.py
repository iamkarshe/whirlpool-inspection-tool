from fastapi import APIRouter, Depends, Request

from mod.api.integration.helper import (
    get_integration_credentials,
    update_aws_s3_credentials,
    update_okta_credentials,
)
from mod.api.integration.request import AwsS3UpdateRequest, OktaSsoUpdateRequest
from mod.api.integration.response import IntegrationCredentialsResponse
from mod.api.middleware import auth_dependency
from utils.decorator import check_api_role, exception_handler_decorator

router = APIRouter(
    tags=["App Integration"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get("/integrations", response_model=IntegrationCredentialsResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_integrations(request: Request):
    return get_integration_credentials()


@router.put("/integrations/okta-sso", response_model=IntegrationCredentialsResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def put_okta_sso_integration(
    request: Request,
    payload: OktaSsoUpdateRequest,
):
    return update_okta_credentials(payload)


@router.put("/integrations/aws-s3", response_model=IntegrationCredentialsResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def put_aws_s3_integration(
    request: Request,
    payload: AwsS3UpdateRequest,
):
    return update_aws_s3_credentials(payload)
