from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from mod.api.log.audit import log_user_onboarded
from mod.api.user.onboard_helper import onboard_existing_user
from mod.auth.onboarding_email import deliver_welcome_onboarding_email_with_retry
from mod.auth.onboarding_vpn import prepare_onboarding_vpn_if_needed
from mod.model import Role, User
from utils.roles import ROLE_SUPERADMIN

DEFAULT_ONBOARD_EMAIL_MAX_ATTEMPTS = 3
DEFAULT_ONBOARD_EMAIL_RETRY_DELAY_SECONDS = 5.0


@dataclass(frozen=True)
class UserOnboardDeliveryResult:
    user: User
    temporary_password: str
    target_role: str
    welcome_email_sent: bool
    include_vpn_instructions: bool


def listUsersPendingOnboardEmail(db: Session) -> list[User]:
    return (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .options(joinedload(User.role))
        .filter(
            User.is_active.is_(True),
            Role.role != ROLE_SUPERADMIN,
            User.must_change_password.is_(True),
            User.onboard_email_sent_at.is_(None),
        )
        .order_by(User.id.asc())
        .all()
    )


def deliverUserOnboarding(
    db: Session,
    *,
    user_uuid: uuid.UUID,
    actor_user_id: int,
    email_max_attempts: int = DEFAULT_ONBOARD_EMAIL_MAX_ATTEMPTS,
    email_retry_delay_seconds: float = DEFAULT_ONBOARD_EMAIL_RETRY_DELAY_SECONDS,
) -> UserOnboardDeliveryResult:
    result = onboard_existing_user(db, user_uuid=user_uuid)
    vpn_email_payload = prepare_onboarding_vpn_if_needed(db, result.user)
    include_vpn_instructions = vpn_email_payload is not None
    attachments = (
        vpn_email_payload.attachments if vpn_email_payload is not None else None
    )

    welcome_email_sent = deliver_welcome_onboarding_email_with_retry(
        db,
        to_email=result.user.email,
        user_name=result.user.name,
        temporary_password=result.temporary_password,
        include_vpn_instructions=include_vpn_instructions,
        attachments=attachments,
        actor_user_id=actor_user_id,
        max_attempts=email_max_attempts,
        retry_delay_seconds=email_retry_delay_seconds,
    )

    if welcome_email_sent:
        result.user.onboard_email_sent_at = datetime.now(timezone.utc)

    log_user_onboarded(
        db,
        actor_user_id=actor_user_id,
        target_user_uuid=str(result.user.uuid),
        target_email=result.user.email,
        target_name=result.user.name,
        target_role=result.target_role,
        welcome_email_sent=welcome_email_sent,
    )

    return UserOnboardDeliveryResult(
        user=result.user,
        temporary_password=result.temporary_password,
        target_role=result.target_role,
        welcome_email_sent=welcome_email_sent,
        include_vpn_instructions=include_vpn_instructions,
    )
