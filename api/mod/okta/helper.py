import base64
from typing import Any

import httpx
from fastapi import HTTPException, status

from mod.api.integration.helper import get_okta_credentials


def okta_oauth_base_url(okta_domain: str) -> str:
    return f"{okta_domain.rstrip('/')}/oauth2/default/v1"


def okta_basic_auth_header(client_id: str, client_secret: str) -> str:
    client_credentials_bytes = f"{client_id}:{client_secret}".encode()
    return f"Basic {base64.b64encode(client_credentials_bytes).decode()}"


def raise_okta_http_error(
    *,
    step: str,
    response: httpx.Response,
) -> None:
    detail = f"Okta {step} request failed"
    try:
        body = response.json()
        if isinstance(body, dict):
            error = body.get("error") or body.get("errorCode")
            description = body.get("error_description") or body.get("errorSummary")
            if error or description:
                detail = f"{detail}: {error or ''} {description or ''}".strip()
    except ValueError:
        if response.text:
            detail = f"{detail}: {response.text[:500]}"

    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


def get_okta_access_token(code: str) -> str:
    credentials = get_okta_credentials()
    token_url = f"{okta_oauth_base_url(credentials.okta_domain)}/token"

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            token_url,
            headers={
                "Authorization": okta_basic_auth_header(
                    credentials.client_id,
                    credentials.client_secret,
                ),
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": credentials.redirect_uri,
            },
        )

    if response.status_code >= 400:
        raise_okta_http_error(step="token", response=response)

    payload = response.json()
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Okta token response was not a JSON object",
        )

    access_token = payload.get("access_token")
    if not access_token or not isinstance(access_token, str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Okta token response did not include access_token",
        )

    return access_token


def normalize_okta_user_info(payload: dict[str, Any]) -> dict[str, str]:
    return {key: str(value) for key, value in payload.items() if value is not None}


def get_okta_user_info(access_token: str) -> dict[str, str]:
    credentials = get_okta_credentials()
    userinfo_url = f"{okta_oauth_base_url(credentials.okta_domain)}/userinfo"

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            userinfo_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )

    if response.status_code >= 400:
        raise_okta_http_error(step="userinfo", response=response)

    payload = response.json()
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Okta userinfo response was not a JSON object",
        )

    return normalize_okta_user_info(payload)


def resolve_okta_user_email(user_info: dict[str, str]) -> str:
    email = (
        user_info.get("email")
        or user_info.get("preferred_username")
        or user_info.get("sub")
        or ""
    ).strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Okta userinfo did not include an email address",
        )
    return email
