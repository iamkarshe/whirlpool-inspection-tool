import uuid

from fastapi import APIRouter, Depends, Request, Response

from mod.api.middleware import auth_dependency
from mod.api.vpn.helper import proxy_vpn_provision_request
from mod.api.vpn.request import VpnDeviceCreateRequest
from utils.decorator import check_api_role, exception_handler_decorator

router = APIRouter(
    tags=["VPN Provision"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api/vpn",
)


@router.get(
    "/health",
    name="vpn_provision_health",
    description="Health of the VPN provision service",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_health(request: Request) -> Response:
    return proxy_vpn_provision_request(method="GET", upstream_path="/health")


@router.post(
    "/devices",
    name="vpn_provision_create_device",
    description="Create a VPN provisioned device",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_create_device(
    request: Request,
    payload: VpnDeviceCreateRequest,
) -> Response:
    return proxy_vpn_provision_request(
        method="POST",
        upstream_path="/v1/devices",
        json_body=payload.model_dump(mode="json"),
    )


@router.get(
    "/devices",
    name="vpn_provision_list_devices",
    description="List active VPN provisioned devices",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_list_devices(request: Request) -> Response:
    return proxy_vpn_provision_request(method="GET", upstream_path="/v1/devices")


@router.get(
    "/devices/{device_uuid}/config",
    name="vpn_provision_device_config",
    description="Get VPN config for a provisioned device",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_device_config(
    request: Request,
    device_uuid: uuid.UUID,
) -> Response:
    return proxy_vpn_provision_request(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/config",
    )


@router.get(
    "/devices/{device_uuid}/qr",
    name="vpn_provision_device_qr",
    description="Get VPN QR code for a provisioned device",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_device_qr(
    request: Request,
    device_uuid: uuid.UUID,
) -> Response:
    return proxy_vpn_provision_request(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/qr",
    )


@router.get(
    "/devices/{device_uuid}/revoke",
    name="vpn_provision_revoke_device",
    description="Revoke a VPN provisioned device",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_revoke_device(
    request: Request,
    device_uuid: uuid.UUID,
) -> Response:
    return proxy_vpn_provision_request(
        method="GET",
        upstream_path=f"/v1/devices/{device_uuid}/revoke",
    )


@router.get(
    "/peers",
    name="vpn_provision_wireguard_peers",
    description="Get connected WireGuard peer details",
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def vpn_provision_wireguard_peers(request: Request) -> Response:
    return proxy_vpn_provision_request(
        method="GET",
        upstream_path="/v1/wireguard/peers",
    )
