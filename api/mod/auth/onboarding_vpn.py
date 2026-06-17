from __future__ import annotations

import base64
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from mod.api.vpn.helper import (
    create_vpn_device,
    fetch_vpn_device_config_bytes,
    fetch_vpn_device_qr_bytes,
)
from mod.model import User
from utils.env import is_vpn_provision_configured

logger = logging.getLogger(__name__)

WIREGUARD_INSTALL_URL = "https://www.wireguard.com/install/"
WIREGUARD_ANDROID_URL = (
    "https://play.google.com/store/apps/details?id=com.wireguard.android"
)
WIREGUARD_IOS_URL = "https://apps.apple.com/app/wireguard/id1441195209"
DEFAULT_ONBOARDING_VPN_DEVICE_TYPE = "android"


def vpn_config_filename(email: str) -> str:
    return f"{email}-wireguard-vpn.conf"


def vpn_qr_filename(email: str) -> str:
    return f"{email}-wireguard-vpn-qr.png"


def is_first_time_vpn_user(user: User) -> bool:
    return user.vpn_device_uuid is None


def build_vpn_setup_instructions_text(*, user_name: str, user_email: str) -> str:
    first_name = (user_name.split() or [user_name])[0]
    config_file = vpn_config_filename(user_email)
    qr_file = vpn_qr_filename(user_email)
    return (
        f"Hi {first_name},\n\n"
        "Your warehouse VPN profile is ready. Follow the steps below to connect "
        "with WireGuard before signing in to the application.\n\n"
        "MOBILE\n"
        "1. Install WireGuard from the App Store or Google Play:\n"
        f"   iOS: {WIREGUARD_IOS_URL}\n"
        f"   Android: {WIREGUARD_ANDROID_URL}\n"
        "2. Open WireGuard and add a tunnel:\n"
        f"   • Import the attached config file ({config_file}), or\n"
        f"   • Scan the attached QR image ({qr_file}).\n"
        "3. Enable the tunnel to connect.\n\n"
        "DESKTOP / LAPTOP\n"
        f"1. Install WireGuard: {WIREGUARD_INSTALL_URL}\n"
        f'2. Import the attached config file ({config_file}) using "Import tunnel(s) from file".\n'
        "3. Activate the tunnel to connect.\n\n"
        "If you need help, contact your administrator.\n"
    )


def build_vpn_setup_instructions_html(*, user_name: str, user_email: str) -> str:
    first_name = (user_name.split() or [user_name])[0]
    config_file = vpn_config_filename(user_email)
    qr_file = vpn_qr_filename(user_email)
    return (
        f"<p>Hi {first_name},</p>"
        "<p>Your warehouse VPN profile is ready. Follow the steps below to connect "
        "with WireGuard before signing in to the application.</p>"
        "<p><strong>MOBILE</strong></p>"
        "<ol>"
        "<li>Install WireGuard from the App Store or Google Play:<br/>"
        f'iOS: <a href="{WIREGUARD_IOS_URL}">{WIREGUARD_IOS_URL}</a><br/>'
        f'Android: <a href="{WIREGUARD_ANDROID_URL}">{WIREGUARD_ANDROID_URL}</a>'
        "</li>"
        "<li>Open WireGuard and add a tunnel:<br/>"
        f"Import the attached config file (<code>{config_file}</code>), or<br/>"
        f"Scan the attached QR image (<code>{qr_file}</code>)."
        "</li>"
        "<li>Enable the tunnel to connect.</li>"
        "</ol>"
        "<p><strong>DESKTOP / LAPTOP</strong></p>"
        "<ol>"
        f'<li>Install WireGuard: <a href="{WIREGUARD_INSTALL_URL}">{WIREGUARD_INSTALL_URL}</a></li>'
        f'<li>Import the attached config file (<code>{config_file}</code>) using '
        '"Import tunnel(s) from file".</li>'
        "<li>Activate the tunnel to connect.</li>"
        "</ol>"
        "<p>If you need help, contact your administrator.</p>"
    )


def encode_email_attachment(
    *,
    filename: str,
    content: bytes,
    content_type: str,
) -> dict[str, str]:
    return {
        "filename": filename,
        "content_type": content_type,
        "content_b64": base64.b64encode(content).decode("ascii"),
    }


@dataclass(frozen=True)
class OnboardingVpnEmailPayload:
    attachments: list[dict[str, str]]


def provision_user_vpn_for_onboarding(
    db: Session,
    user: User,
    *,
    device_type: str = DEFAULT_ONBOARDING_VPN_DEVICE_TYPE,
) -> uuid.UUID:
    resolved_device_name = (user.name or "").strip()
    if not resolved_device_name:
        raise ValueError("device_name could not be resolved from user name")

    provisioned_device_uuid = create_vpn_device(
        user_name=user.name,
        user_email=user.email,
        device_name=resolved_device_name,
        device_type=device_type,
    )
    user.vpn_device_uuid = provisioned_device_uuid
    user.vpn_device_name = resolved_device_name
    user.vpn_device_type = device_type
    user.vpn_provisioned_at = datetime.now(timezone.utc)
    db.flush()
    return provisioned_device_uuid


def build_onboarding_vpn_email_payload(
    *,
    user_email: str,
    device_uuid: uuid.UUID,
) -> OnboardingVpnEmailPayload:
    config_content, config_content_type = fetch_vpn_device_config_bytes(device_uuid)
    qr_content, qr_content_type = fetch_vpn_device_qr_bytes(device_uuid)
    return OnboardingVpnEmailPayload(
        attachments=[
            encode_email_attachment(
                filename=vpn_config_filename(user_email),
                content=config_content,
                content_type=config_content_type,
            ),
            encode_email_attachment(
                filename=vpn_qr_filename(user_email),
                content=qr_content,
                content_type=qr_content_type,
            ),
        ]
    )


def prepare_onboarding_vpn_if_needed(
    db: Session,
    user: User,
) -> OnboardingVpnEmailPayload | None:
    if not is_first_time_vpn_user(user):
        return None
    if not is_vpn_provision_configured():
        logger.info(
            "Skipping onboarding VPN provision for %s; VPN service not configured",
            user.email,
        )
        return None

    try:
        device_uuid = provision_user_vpn_for_onboarding(db, user)
        return build_onboarding_vpn_email_payload(
            user_email=user.email,
            device_uuid=device_uuid,
        )
    except Exception:
        logger.exception(
            "Onboarding VPN provision failed for %s; welcome email will omit VPN attachments",
            user.email,
        )
        return None
