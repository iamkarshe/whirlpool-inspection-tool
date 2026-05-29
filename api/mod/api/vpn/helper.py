from typing import Any, NamedTuple

import httpx
from fastapi import HTTPException, Response, status

from utils.env import get_vpn_provision_key, get_vpn_provision_server

VPN_SERVICE_UNAVAILABLE_DETAIL = "VPN service not available"
VPN_PROVISION_TIMEOUT_SECONDS = 30.0


class VpnProvisionConfig(NamedTuple):
    server_url: str
    api_key: str


def get_vpn_provision_config() -> VpnProvisionConfig:
    server = get_vpn_provision_server()
    api_key = get_vpn_provision_key()
    if server is None or api_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=VPN_SERVICE_UNAVAILABLE_DETAIL,
        )
    return VpnProvisionConfig(server_url=server.rstrip("/"), api_key=api_key)


def vpn_provision_authorization_header(api_key: str) -> dict[str, str]:
    return {"authorization": f"Bearer {api_key}"}


def proxy_vpn_provision_request(
    *,
    method: str,
    upstream_path: str,
    json_body: dict[str, Any] | None = None,
) -> Response:
    config = get_vpn_provision_config()
    url = f"{config.server_url}{upstream_path}"
    headers = vpn_provision_authorization_header(config.api_key)
    if json_body is not None:
        headers["content-type"] = "application/json"

    try:
        with httpx.Client(timeout=VPN_PROVISION_TIMEOUT_SECONDS) as client:
            upstream_response = client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_body,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"VPN provision server request failed: {exc}",
        ) from exc

    response_headers: dict[str, str] = {}
    content_type = upstream_response.headers.get("content-type")
    if content_type:
        response_headers["content-type"] = content_type

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=content_type,
    )
