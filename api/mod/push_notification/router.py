from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.push_notification.helper import upsert_push_subscription
from mod.push_notification.request import PushSubscriptionCreate
from utils.db import get_db
from utils.env import get_env

router = APIRouter(prefix="/api/push", tags=["push"])

VAPID_PUBLIC_KEY = get_env("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY_PATH = get_env("VAPID_PRIVATE_KEY_PATH")
VAPID_SUBJECT = get_env("VAPID_SUBJECT")


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
        upsert_push_subscription(db, user_id, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
