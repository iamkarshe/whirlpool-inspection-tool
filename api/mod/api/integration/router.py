from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from utils.db import get_db

from mod.api.integration.helper import (
    get_integration_credentials,
    test_aws_s3_connection,
    test_smtp_connection,
    update_aws_s3_credentials,
    update_okta_credentials,
    update_smtp_credentials,
)
from mod.api.integration.request import (
    AwsS3UpdateRequest,
    OktaSsoUpdateRequest,
    SmtpTestConnectionRequest,
    SmtpUpdateRequest,
)
from mod.api.integration.response import (
    AwsS3TestConnectionResponse,
    IntegrationCredentialsResponse,
    SmtpTestConnectionResponse,
)
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
    db: Session = Depends(get_db),
):
    return update_okta_credentials(db, int(request.state.user_id), payload)


@router.put("/integrations/aws-s3", response_model=IntegrationCredentialsResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def put_aws_s3_integration(
    request: Request,
    payload: AwsS3UpdateRequest,
    db: Session = Depends(get_db),
):
    return update_aws_s3_credentials(db, int(request.state.user_id), payload)


@router.put("/integrations/smtp", response_model=IntegrationCredentialsResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def put_smtp_integration(
    request: Request,
    payload: SmtpUpdateRequest,
    db: Session = Depends(get_db),
):
    return update_smtp_credentials(db, int(request.state.user_id), payload)


@router.post(
    "/integrations/aws-s3/test-connection",
    response_model=AwsS3TestConnectionResponse,
    name="test_aws_s3_connection",
    description="Test AWS S3 connectivity using saved credentials or an optional request body",
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_aws_s3_test_connection(
    request: Request,
    payload: AwsS3UpdateRequest | None = None,
):
    return test_aws_s3_connection(payload)


@router.post(
    "/integrations/smtp/test-connection",
    response_model=SmtpTestConnectionResponse,
    name="test_smtp_connection",
    description=(
        "Send a test email using saved SMTP settings or an optional smtp override. "
        "On failure, error_trace contains the full stack trace for the UI."
    ),
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_smtp_test_connection(
    request: Request,
    payload: SmtpTestConnectionRequest,
):
    return test_smtp_connection(payload)
