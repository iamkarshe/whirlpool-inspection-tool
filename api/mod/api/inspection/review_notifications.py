from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session, joinedload

from mod.model import Inspection, Role, User, Warehouse
from mod.push_notification.config import vapid_send_credentials_optional
from mod.push_notification.helper import send_user_push_notifications
from mod.push_notification.request import PushSendPayload
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP
from mod.tasks.email_delivery import (
    EMAIL_KIND_INSPECTION_REVIEW,
    send_and_log_task_email,
)
from mod.tasks.email_send import resolve_smtp_config_from_payload
from mod.tasks.queue import try_enqueue_background_task
from utils.env import get_frontend_base_url, is_celery_broker_configured

logger = logging.getLogger(__name__)

INSPECTION_REVIEW_URL_PATH_PREFIX = "/ops/inspections/"
TASK_TYPE_NOTIFY_INSPECTION_REVIEW = "notify_inspection_review_managers"


def inspection_review_detail_path(inspection_uuid: uuid.UUID) -> str:
    return f"{INSPECTION_REVIEW_URL_PATH_PREFIX}{inspection_uuid}"


def inspection_review_absolute_url(inspection_uuid: uuid.UUID) -> str:
    path = inspection_review_detail_path(inspection_uuid)
    base = get_frontend_base_url()
    if base:
        return f"{base.rstrip('/')}{path}"
    return path


def list_warehouse_managers(
    db: Session,
    warehouse_code: str,
    *,
    exclude_user_id: int | None = None,
) -> list[User]:
    query = (
        db.query(User)
        .options(joinedload(User.role))
        .join(User.role)
        .join(User.warehouses_scope)
        .filter(
            User.is_active.is_(True),
            Role.role.in_(["manager", "biz-admin"]),
            Role.is_active.is_(True),
            Warehouse.warehouse_code == warehouse_code,
            Warehouse.is_active.is_(True),
        )
    )
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    return query.distinct().all()


def inspection_type_label(inspection: Inspection) -> str:
    raw = (
        inspection.inspection_type.value
        if hasattr(inspection.inspection_type, "value")
        else str(inspection.inspection_type)
    )
    return raw.strip().lower()


def resolve_inspector_name(
    db: Session, exclude_inspector_user_id: int | None
) -> str | None:
    if exclude_inspector_user_id is None:
        return None
    inspector = db.query(User).filter(User.id == exclude_inspector_user_id).first()
    return inspector.name if inspector is not None else None


def build_inspection_ready_for_review_push(
    inspection: Inspection,
    *,
    inspector_name: str | None = None,
) -> PushSendPayload:
    inspection_type = inspection_type_label(inspection)
    type_label = inspection_type.capitalize()
    warehouse = (inspection.warehouse_code or "").strip()
    who = (inspector_name or "An inspector").strip()
    title = f"{type_label} inspection ready for review"
    body = (
        f"{who} submitted a {inspection_type} inspection"
        f"{f' at {warehouse}' if warehouse else ''}. Tap to review."
    )
    return PushSendPayload(
        title=title,
        body=body,
        url=inspection_review_detail_path(inspection.uuid),
        tag=f"inspection-review-{inspection.uuid}",
        data={
            "inspection_uuid": str(inspection.uuid),
            "inspection_type": inspection_type,
            "warehouse_code": warehouse or None,
        },
    )


def build_inspection_review_email_message(
    *,
    manager: User,
    push_payload: PushSendPayload,
    review_url: str,
    smtp_from_email: str,
    smtp_from_name: str,
) -> dict[str, Any]:
    manager_name = (manager.name or "").strip() or "Manager"
    greeting = f"Hello {manager_name},\n\n"
    body_text = (
        f"{greeting}{push_payload.body}\n\n"
        f"Review the inspection: {review_url}\n\n"
        "— Whirlpool Inspection Tool"
    )
    body_html = (
        f"<p>Hello {manager_name},</p>"
        f"<p>{push_payload.body}</p>"
        f'<p><a href="{review_url}">Open inspection for review</a></p>'
        "<p>— Whirlpool Inspection Tool</p>"
    )
    return {
        "from_email": smtp_from_email,
        "from_name": smtp_from_name,
        "to_email": str(manager.email).strip(),
        "subject": push_payload.title,
        "body_text": body_text,
        "body_html": body_html,
    }


def load_inspection_for_review_notify(
    db: Session, inspection_uuid: uuid.UUID
) -> Inspection | None:
    return (
        db.query(Inspection)
        .filter(Inspection.uuid == inspection_uuid, Inspection.is_active.is_(True))
        .first()
    )


def execute_inspection_review_manager_notifications(
    db: Session,
    payload: dict[str, Any],
) -> dict[str, Any]:
    inspection_uuid = uuid.UUID(str(payload["inspection_uuid"]))
    exclude_inspector_user_id = payload.get("exclude_inspector_user_id")
    if exclude_inspector_user_id is not None:
        exclude_inspector_user_id = int(exclude_inspector_user_id)

    inspection = load_inspection_for_review_notify(db, inspection_uuid)
    if inspection is None:
        raise ValueError(f"Inspection not found: {inspection_uuid}")

    warehouse_code = (inspection.warehouse_code or "").strip()
    if not warehouse_code:
        return {
            "skipped": True,
            "reason": "missing_warehouse_code",
            "inspection_uuid": str(inspection_uuid),
        }

    managers = list_warehouse_managers(
        db,
        warehouse_code,
        exclude_user_id=exclude_inspector_user_id,
    )
    if not managers:
        return {
            "target_managers": 0,
            "emails_sent": 0,
            "managers_push_notified": 0,
            "inspection_uuid": str(inspection_uuid),
        }

    inspector_name = resolve_inspector_name(db, exclude_inspector_user_id)
    push_payload = build_inspection_ready_for_review_push(
        inspection,
        inspector_name=inspector_name,
    )
    review_url = inspection_review_absolute_url(inspection.uuid)

    vapid = vapid_send_credentials_optional()
    smtp_config: dict[str, Any] | None = None
    smtp_from_email = ""
    smtp_from_name = ""
    try:
        smtp_config = resolve_smtp_config_from_payload(
            {"credential_key": CREDENTIAL_KEY_DEFAULT_SMTP}
        )
        smtp_from_email = str(smtp_config.get("from_email", "") or "").strip()
        smtp_from_name = str(smtp_config.get("from_name", "") or "").strip()
    except Exception:
        logger.warning(
            "SMTP not configured; inspection review emails skipped for %s",
            inspection_uuid,
        )

    emails_sent = 0
    emails_failed = 0
    emails_skipped_no_address = 0
    managers_push_notified = 0
    push_attempted_users = 0

    for manager in managers:
        manager_email = str(manager.email or "").strip()
        if smtp_config and smtp_from_email and manager_email:
            try:
                email_message = build_inspection_review_email_message(
                    manager=manager,
                    push_payload=push_payload,
                    review_url=review_url,
                    smtp_from_email=smtp_from_email,
                    smtp_from_name=smtp_from_name,
                )
                send_and_log_task_email(
                    db,
                    smtp_config,
                    email_message,
                    email_kind=EMAIL_KIND_INSPECTION_REVIEW,
                    actor_user_id=manager.id,
                    delivery_mode="direct",
                    created_by="inspection_review_notification",
                )
                emails_sent += 1
            except Exception:
                emails_failed += 1
                logger.exception(
                    "Inspection review email failed user_id=%s inspection=%s",
                    manager.id,
                    inspection_uuid,
                )
        elif not manager_email:
            emails_skipped_no_address += 1

        if vapid is None:
            continue

        private_path, subject = vapid
        try:
            push_attempted_users += 1
            summary = send_user_push_notifications(
                db,
                manager.id,
                push_payload,
                vapid_private_key_path=private_path,
                vapid_subject=subject,
            )
            if summary.get("sent", 0) > 0:
                managers_push_notified += 1
        except Exception:
            logger.exception(
                "Inspection review push failed user_id=%s inspection=%s",
                manager.id,
                inspection_uuid,
            )

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to commit inspection review notification records inspection=%s",
            inspection_uuid,
        )
        raise

    return {
        "inspection_uuid": str(inspection_uuid),
        "warehouse_code": warehouse_code,
        "target_managers": len(managers),
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "emails_skipped_no_address": emails_skipped_no_address,
        "managers_push_notified": managers_push_notified,
        "push_users_attempted": push_attempted_users,
        "push_enabled": vapid is not None,
        "email_enabled": bool(smtp_config and smtp_from_email),
    }


def schedule_inspection_review_manager_notifications(
    db: Session,
    inspection: Inspection,
    *,
    exclude_inspector_user_id: int | None = None,
) -> dict[str, Any]:
    payload = {
        "inspection_uuid": str(inspection.uuid),
        "exclude_inspector_user_id": exclude_inspector_user_id,
    }

    task_uuid = try_enqueue_background_task(
        db,
        task_type=TASK_TYPE_NOTIFY_INSPECTION_REVIEW,
        payload=payload,
        created_by="system:inspection_review",
    )
    if task_uuid is not None:
        return {
            "queued": True,
            "task_uuid": str(task_uuid),
            "inspection_uuid": str(inspection.uuid),
        }

    if not is_celery_broker_configured():
        logger.info(
            "REDIS_URL not set; running inspection review notifications synchronously"
        )
    result = execute_inspection_review_manager_notifications(db, payload)
    return {"queued": False, **result}
