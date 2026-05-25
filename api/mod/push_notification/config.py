"""VAPID credentials shared by push routes and background notification sends."""

from utils.env import get_env, get_env_optional


def vapid_send_credentials_optional() -> tuple[str, str] | None:
    """Private key path and mailto subject when both are configured."""
    private_path = get_env_optional("VAPID_PRIVATE_KEY_PATH")
    subject = get_env_optional("VAPID_SUBJECT")
    if not private_path or not subject:
        return None
    return private_path, subject


# Loaded at import for push HTTP routes (same behavior as before).
VAPID_PUBLIC_KEY = get_env("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY_PATH = get_env("VAPID_PRIVATE_KEY_PATH")
VAPID_SUBJECT = get_env("VAPID_SUBJECT")
