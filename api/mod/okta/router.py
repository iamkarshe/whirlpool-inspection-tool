import time
import uuid
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from mod.api.integration.helper import get_okta_credentials

router = APIRouter(tags=["Okta SSO"])


@router.get("/okta-sso")
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
    nonce = str(time.time())
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
    return RedirectResponse(okta_login_url)
