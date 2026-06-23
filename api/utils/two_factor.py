"""TOTP secret encryption and verification helpers."""

from __future__ import annotations

import base64
import hashlib

import pyotp
from cryptography.fernet import Fernet, InvalidToken

from utils.env import get_env_optional
from utils.jwt import SECRET_KEY

TWO_FACTOR_ISSUER_DEFAULT = "Whirlpool PDI Tool"
TOTP_VALID_WINDOW = 1


def two_factor_issuer() -> str:
    return (get_env_optional("TWO_FACTOR_ISSUER") or TWO_FACTOR_ISSUER_DEFAULT).strip()


def build_fernet() -> Fernet:
    digest = hashlib.sha256(f"totp:{SECRET_KEY}".encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def encrypt_totp_secret(secret: str) -> str:
    normalized = secret.strip().upper()
    return build_fernet().encrypt(normalized.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(encrypted_secret: str) -> str:
    try:
        raw = build_fernet().decrypt(encrypted_secret.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Stored two-factor secret is invalid") from exc
    return raw.decode("utf-8")


def build_totp_for_secret(secret: str) -> pyotp.TOTP:
    return pyotp.TOTP(secret.strip().upper())


def build_provisioning_uri(*, secret: str, account_name: str) -> str:
    return build_totp_for_secret(secret).provisioning_uri(
        name=account_name,
        issuer_name=two_factor_issuer(),
    )


def verify_totp_code(*, secret: str, code: str) -> bool:
    normalized = (code or "").strip().replace(" ", "")
    if not normalized.isdigit():
        return False
    return bool(build_totp_for_secret(secret).verify(normalized, valid_window=TOTP_VALID_WINDOW))


def user_has_two_factor_enabled(user) -> bool:
    return bool(getattr(user, "two_factor_enabled", False))


def user_has_two_factor_enforced(user) -> bool:
    return bool(getattr(user, "two_factor_enforced", False))


def user_requires_two_factor_at_login(user) -> bool:
    return user_has_two_factor_enabled(user)


def user_requires_two_factor_setup_at_login(user) -> bool:
    return user_has_two_factor_enforced(user) and not user_has_two_factor_enabled(user)


def verify_user_totp_code(user, code: str) -> bool:
    encrypted_secret = getattr(user, "two_factor_secret", None)
    if not encrypted_secret:
        return False
    try:
        secret = decrypt_totp_secret(encrypted_secret)
    except ValueError:
        return False
    return verify_totp_code(secret=secret, code=code)
