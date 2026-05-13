import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.model import Device, PushNotification, PushSubscription
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
