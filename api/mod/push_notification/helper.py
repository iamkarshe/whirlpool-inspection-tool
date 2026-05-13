import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from mod.model import (
    Device,
    PushNotification,
    PushNotificationStatus,
    PushSubscription,
)
from mod.push_notification.request import PushSendPayload, PushSubscriptionCreate


def resolve_push_subscription_device(
    db: Session,
    user_id: int,
    device_uuid: str | None,
    device_fingerprint: str | None,
) -> Device | None:
    if device_uuid:
        try:
            parsed_device_uuid = uuid.UUID(str(device_uuid))
        except ValueError:
            raise HTTPException(status_code=400, detail="device_uuid must be a UUID")
        device = (
            db.query(Device)
            .filter(
                Device.uuid == parsed_device_uuid,
                Device.user_id == user_id,
                Device.is_active.is_(True),
            )
            .first()
        )
        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")
        return device

    normalized_device_fingerprint = (device_fingerprint or "").strip()
    if not normalized_device_fingerprint:
        return None

    return (
        db.query(Device)
        .filter(
            Device.device_fingerprint == normalized_device_fingerprint,
            Device.user_id == user_id,
            Device.is_active.is_(True),
        )
        .first()
    )


def upsert_push_subscription(
    db: Session,
    user_id: int,
    payload: PushSubscriptionCreate,
) -> PushSubscription:
    subscription = payload.subscription
    device = resolve_push_subscription_device(
        db,
        user_id,
        payload.device_uuid,
        payload.device_fingerprint,
    )
    normalized_device_fingerprint = (
        payload.device_fingerprint
        or (device.device_fingerprint if device is not None else "")
        or ""
    ).strip()

    push_subscription = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == subscription.endpoint)
        .first()
    )
    if push_subscription is None:
        push_subscription = PushSubscription(endpoint=subscription.endpoint)
        db.add(push_subscription)

    push_subscription.user_id = user_id
    push_subscription.device_id = device.id if device is not None else None
    push_subscription.device_fingerprint = normalized_device_fingerprint or None
    push_subscription.p256dh = subscription.keys.p256dh
    push_subscription.auth = subscription.keys.auth
    push_subscription.expiration_time = subscription.expirationTime
    push_subscription.user_agent = payload.user_agent.strip()
    push_subscription.timezone = payload.timezone.strip()
    push_subscription.is_active = True

    db.flush()
    return push_subscription


def create_pending_push_notification(
    db: Session,
    user_id: int,
    payload: PushSendPayload,
    push_subscription: PushSubscription | None = None,
    device: Device | None = None,
) -> PushNotification:
    resolved_device = device or (
        push_subscription.device if push_subscription is not None else None
    )
    push_notification = PushNotification(
        user_id=user_id,
        device_id=resolved_device.id if resolved_device is not None else None,
        push_subscription_id=push_subscription.id
        if push_subscription is not None
        else None,
        title=payload.title,
        body=payload.body,
        url=payload.url,
        tag=payload.tag,
        icon=payload.icon,
        badge=payload.badge,
        payload_data=payload.data,
    )
    db.add(push_notification)
    db.flush()
    return push_notification


def list_active_subscriptions_for_user(
    db: Session,
    user_id: int,
) -> list[PushSubscription]:
    return (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active.is_(True),
        )
        .all()
    )


def mark_push_notification_sent(
    push_notification: PushNotification,
) -> None:
    push_notification.status = PushNotificationStatus.sent
    push_notification.sent_at = datetime.now(timezone.utc)
    push_notification.failure_status_code = None
    push_notification.failure_message = None


def mark_push_notification_failed(
    push_notification: PushNotification,
    *,
    status_code: int | None,
    message: str,
) -> None:
    push_notification.status = PushNotificationStatus.failed
    push_notification.failure_status_code = status_code
    push_notification.failure_message = message[:4000]


def deactivate_push_subscription(push_subscription: PushSubscription) -> None:
    push_subscription.is_active = False


def push_payload_dict(payload: PushSendPayload) -> dict:
    return payload.model_dump(exclude_none=True)


def send_web_push(
    db: Session,
    push_subscription: PushSubscription,
    payload: PushSendPayload,
    *,
    vapid_private_key_path: str,
    vapid_subject: str,
) -> PushNotification:
    push_notification = create_pending_push_notification(
        db,
        user_id=push_subscription.user_id,
        payload=payload,
        push_subscription=push_subscription,
    )
    subscription_info = {
        "endpoint": push_subscription.endpoint,
        "keys": {
            "p256dh": push_subscription.p256dh,
            "auth": push_subscription.auth,
        },
    }
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(push_payload_dict(payload)),
            vapid_private_key=vapid_private_key_path,
            vapid_claims={"sub": vapid_subject},
        )
    except WebPushException as exc:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        mark_push_notification_failed(
            push_notification,
            status_code=status_code,
            message=str(exc),
        )
        if status_code in {404, 410}:
            deactivate_push_subscription(push_subscription)
        db.flush()
        return push_notification

    mark_push_notification_sent(push_notification)
    db.flush()
    return push_notification


def send_user_push_notifications(
    db: Session,
    user_id: int,
    payload: PushSendPayload,
    *,
    vapid_private_key_path: str,
    vapid_subject: str,
) -> dict[str, int]:
    push_subscriptions = list_active_subscriptions_for_user(db, user_id)
    attempted = sent = failed = deactivated = 0
    for push_subscription in push_subscriptions:
        was_active = bool(push_subscription.is_active)
        push_notification = send_web_push(
            db,
            push_subscription,
            payload,
            vapid_private_key_path=vapid_private_key_path,
            vapid_subject=vapid_subject,
        )
        attempted += 1
        if push_notification.status == PushNotificationStatus.sent:
            sent += 1
        elif push_notification.status == PushNotificationStatus.failed:
            failed += 1
        if was_active and not push_subscription.is_active:
            deactivated += 1

    return {
        "attempted": attempted,
        "sent": sent,
        "failed": failed,
        "deactivated": deactivated,
    }
