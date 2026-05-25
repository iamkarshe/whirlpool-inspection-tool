"""Restrict API routes to VPN clients when LOGIN_VPN_IP is configured."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from utils.env import get_env_optional

VPN_PROTECTED_PATH_PREFIXES = (
    "/auth",
    "/api",
    "/sso",
    "/authorization-code",
)


def get_login_vpn_allowed_ips() -> frozenset[str] | None:
    raw = get_env_optional("LOGIN_VPN_IP")
    if not raw:
        return None
    addresses = {part.strip() for part in raw.split(",") if part.strip()}
    return frozenset(addresses) if addresses else None


def is_vpn_protected_path(path: str) -> bool:
    return path.startswith(VPN_PROTECTED_PATH_PREFIXES)


def observed_client_ips(request: Request) -> list[str]:
    ips: list[str] = []
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        for hop in forwarded.split(","):
            hop = hop.strip()
            if hop and hop not in ips:
                ips.append(hop)
    if request.client and request.client.host:
        host = request.client.host
        if host not in ips:
            ips.append(host)
    return ips


def is_request_from_vpn(request: Request, allowed_ips: frozenset[str]) -> bool:
    return any(ip in allowed_ips for ip in observed_client_ips(request))


class VpnAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        allowed_ips = get_login_vpn_allowed_ips()

        if allowed_ips is None or not is_vpn_protected_path(request.url.path):
            return await call_next(request)

        if is_request_from_vpn(request, allowed_ips):
            return await call_next(request)

        return JSONResponse(
            status_code=403,
            content={
                "detail": "This application is only available over the corporate VPN.",
            },
        )
