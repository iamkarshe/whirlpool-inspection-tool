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
