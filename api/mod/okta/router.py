import secrets
import uuid
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from mod.api.integration.helper import get_okta_credentials
from mod.auth.helper import create_sso_login_token
from mod.okta.helper import (
    get_okta_access_token,
    get_okta_user_info,
    resolve_okta_user_email,
)
from utils.env import get_env

router = APIRouter(tags=["Okta SSO"])


@router.get("/sso")
def okta_sso_login(
    request: Request,
):
    okta_credentials = get_okta_credentials()

    okta_domain = okta_credentials.okta_domain
    client_id = okta_credentials.client_id
    response_type = "code"
    response_mode = "query"
    scope = "openid profile email"
    redirect_uri = okta_credentials.redirect_uri
    nonce = secrets.token_urlsafe(32)
    state = str(uuid.uuid4()).replace("-", "")

    okta_login_url = (
        f"{okta_domain}/oauth2/default/v1/authorize"
        f"?client_id={client_id}"
        f"&response_type={response_type}"
        f"&response_mode={response_mode}"
        f"&scope={scope.replace(' ', '%20')}"
        f"&redirect_uri={redirect_uri}"
        f"&nonce={nonce}"
        f"&state={state}"
    )

    return RedirectResponse(
        url=okta_login_url,
        status_code=302,
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )


@router.get("/authorization-code/callback")
def okta_sso_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
):
    if error:
        detail = error_description or error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Okta authorization failed: {detail}",
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code from Okta",
        )

    okta_access_token = get_okta_access_token(code)
    user_info = get_okta_user_info(okta_access_token)
    email = resolve_okta_user_email(user_info)

    frontend_access_token = create_sso_login_token(email)
    frontend_base_url = get_env("FRONTEND_BASE_URL")
    frontend_url = (
        f"{frontend_base_url}/login?token={quote(frontend_access_token, safe='')}"
    )

    return RedirectResponse(
        url=frontend_url,
        status_code=302,
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )
