from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.push_notification.helper import (
    get_push_target_user_by_uuid_or_404,
    send_user_push_notifications,
    send_web_push,
    upsert_push_subscription,
)
from mod.push_notification.request import (
    PushSendPayload,
    PushSubscriptionCreate,
    PushUserSendRequest,
)
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.env import get_env

router = APIRouter(prefix="/api/push", tags=["Push Notification"])

VAPID_PUBLIC_KEY = get_env("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY_PATH = get_env("VAPID_PRIVATE_KEY_PATH")
VAPID_SUBJECT = get_env("VAPID_SUBJECT")


def current_user_is_superadmin(request: Request) -> bool:
    role_raw = getattr(request.state, "role", None) or ""
    roles = [role.strip() for role in str(role_raw).split(",") if role.strip()]
    return "superadmin" in roles


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post(
    "/subscriptions",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(auth_dependency)],
)
async def save_push_subscription(
    request: Request,
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
):
    user_id = int(request.state.user_id)
    try:
        push_subscription = upsert_push_subscription(db, user_id, payload)
        send_web_push(
            db,
            push_subscription,
            PushSendPayload(
                title="Notifications enabled",
                body="Push notifications are set up on this device.",
                url="/",
                tag="push-notifications-enabled",
            ),
            vapid_private_key_path=VAPID_PRIVATE_KEY_PATH,
            vapid_subject=VAPID_SUBJECT,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise


@router.post(
    "/send/user",
    dependencies=[Depends(auth_dependency)],
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager", "operator"])
def send_user_notification(
    request: Request,
    payload: PushUserSendRequest,
    db: Session = Depends(get_db),
):
    try:
        target_user = get_push_target_user_by_uuid_or_404(db, payload.user_uuid)
        if not current_user_is_superadmin(request) and target_user.id != int(
            request.state.user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only superadmin can send notifications to other users",
            )
        summary = send_user_push_notifications(
            db,
            target_user.id,
            payload.notification,
            vapid_private_key_path=VAPID_PRIVATE_KEY_PATH,
            vapid_subject=VAPID_SUBJECT,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return summary
