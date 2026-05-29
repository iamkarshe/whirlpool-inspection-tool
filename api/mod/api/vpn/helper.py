from typing import Any, NamedTuple

import httpx
import uuid as uuid_module
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


def call_vpn_provision(
    *,
    method: str,
    upstream_path: str,
    json_body: dict[str, Any] | None = None,
) -> httpx.Response:
    config = get_vpn_provision_config()
    url = f"{config.server_url}{upstream_path}"
    headers = vpn_provision_authorization_header(config.api_key)
    if json_body is not None:
        headers["content-type"] = "application/json"

    try:
        with httpx.Client(timeout=VPN_PROVISION_TIMEOUT_SECONDS) as client:
            return client.request(
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


def upstream_response_to_fastapi_response(upstream_response: httpx.Response) -> Response:
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


def proxy_vpn_provision_request(
    *,
    method: str,
    upstream_path: str,
    json_body: dict[str, Any] | None = None,
) -> Response:
    upstream_response = call_vpn_provision(
        method=method,
        upstream_path=upstream_path,
        json_body=json_body,
    )
    return upstream_response_to_fastapi_response(upstream_response)


def raise_vpn_upstream_error(*, step: str, response: httpx.Response) -> None:
    detail = f"VPN provision {step} failed"
    try:
        body = response.json()
        if isinstance(body, dict):
            message = body.get("detail") or body.get("error") or body.get("message")
            if message:
                detail = f"{detail}: {message}"
    except ValueError:
        if response.text:
            detail = f"{detail}: {response.text[:500]}"

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=detail,
    )


def extract_vpn_device_uuid(payload: Any) -> uuid_module.UUID:
    if isinstance(payload, dict):
        for key in ("device_uuid", "uuid", "id"):
            value = payload.get(key)
            if value is not None:
                try:
                    return uuid_module.UUID(str(value))
                except ValueError:
                    continue
        nested = payload.get("data")
        if nested is not None:
            return extract_vpn_device_uuid(nested)
        device = payload.get("device")
        if device is not None:
            return extract_vpn_device_uuid(device)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="VPN provision response did not include a device uuid",
    )


def create_vpn_device(
    *,
    user_name: str,
    user_email: str,
    device_name: str,
    device_type: str,
) -> uuid_module.UUID:
    response = call_vpn_provision(
        method="POST",
        upstream_path="/v1/devices",
        json_body={
            "user_name": user_name,
            "user_email": user_email,
            "device_name": device_name,
            "device_type": device_type,
        },
    )
    if response.status_code >= 400:
        raise_vpn_upstream_error(step="create device", response=response)

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="VPN provision create device response was not JSON",
        ) from exc

    return extract_vpn_device_uuid(payload)


def revoke_vpn_device(device_uuid: uuid_module.UUID) -> None:
    response = call_vpn_provision(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/revoke",
    )
    if response.status_code >= 500:
        raise_vpn_upstream_error(step="revoke device", response=response)


def fetch_vpn_device_config(device_uuid: uuid_module.UUID) -> Response:
    response = call_vpn_provision(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/config",
    )
    if response.status_code >= 400:
        raise_vpn_upstream_error(step="device config", response=response)
    return upstream_response_to_fastapi_response(response)


def fetch_vpn_device_qr(device_uuid: uuid_module.UUID) -> Response:
    response = call_vpn_provision(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/qr",
    )
    if response.status_code >= 400:
        raise_vpn_upstream_error(step="device qr", response=response)
    return upstream_response_to_fastapi_response(response)
