import os

from dotenv import load_dotenv

load_dotenv()


def get_env(key: str, default: str | None = None) -> str:
    value = os.getenv(key, default)
    if value is None or str(value).strip() == "":
        raise RuntimeError(f"Missing environment variable: {key}")
    return str(value)


def get_env_optional(key: str, default: str | None = None) -> str | None:
    value = os.getenv(key, default)
    if value is None:
        return None
    value = str(value).strip()
    if value == "":
        return None
    return value


def get_media_base_url() -> str | None:
    """Base URL for inspection media (``build_url``). ``MEDIA_BASE_URL`` wins, else ``CDN_BASE_URL``."""
    return get_env_optional("MEDIA_BASE_URL") or get_env_optional("CDN_BASE_URL")


def get_media_type() -> str:
    """``local`` stores files under API ``uploads/``; ``s3`` uses the integration bucket."""
    raw = (get_env_optional("MEDIA_TYPE", "local") or "local").strip().lower()
    if raw not in {"local", "s3"}:
        raise RuntimeError(f"Invalid MEDIA_TYPE: {raw!r} (expected local or s3)")
    return raw


def get_media_presigned_url_ttl_seconds() -> int:
    """Pre-signed S3 GET URL lifetime (default 10 minutes)."""
    raw = get_env_optional("MEDIA_PRESIGNED_URL_TTL_SECONDS", "600") or "600"
    try:
        ttl = int(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"Invalid MEDIA_PRESIGNED_URL_TTL_SECONDS: {raw!r}"
        ) from exc
    if ttl < 60 or ttl > 86400:
        raise RuntimeError(
            "MEDIA_PRESIGNED_URL_TTL_SECONDS must be between 60 and 86400"
        )
    return ttl


def get_allow_multi_login() -> bool:
    raw = (get_env_optional("ALLOW_MULTI_LOGIN", "false") or "false").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def get_vpn_provision_server() -> str | None:
    return get_env_optional("VPN_PROVISION_SERVER")


def get_vpn_provision_key() -> str | None:
    return get_env_optional("VPN_PROVISION_KEY")


def is_vpn_provision_configured() -> bool:
    return (
        get_vpn_provision_server() is not None and get_vpn_provision_key() is not None
    )
