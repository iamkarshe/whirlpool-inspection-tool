# PWA Push Notification Integration

This app now supports Web Push notifications through the browser service worker.
The frontend can subscribe a signed-in mobile device and send the subscription to
the API. The API owns VAPID keys, subscription storage, and notification sends.

## Frontend Contract

The PWA expects one of these public-key sources:

```env
VITE_VAPID_PUBLIC_KEY=<public VAPID key>
```

or this API endpoint:

```http
GET /api/push/vapid-public-key
```

Response:

```json
{
  "publicKey": "B..."
}
```

When the user taps **Enable** in the mobile notification prompt, the frontend
creates a browser push subscription and posts it here:

```http
POST /api/push/subscriptions
Authorization: Bearer <access_token>
Content-Type: application/json
```

Payload:

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "device_uuid": "server-device-uuid-or-null",
  "device_fingerprint": "browser-persistent-device-id-or-null",
  "user_agent": "Mozilla/5.0 ...",
  "timezone": "Asia/Calcutta"
}
```

Recommended behavior:

- Upsert subscriptions by `endpoint`.
- Attach the authenticated `user_id` from the JWT/session.
- Attach `device_uuid` when present so notifications can target a specific PWA device.
- Send a welcome/setup confirmation notification after saving the subscription.
- Delete subscriptions when Web Push returns `404` or `410`.
- Persist each outbound push in `push_notifications` before sending so delivery attempts
  can be audited and failed sends can be retried or inspected later.

## FastAPI Setup

Install dependencies:

```bash
pip install pywebpush py-vapid cryptography
```

Generate VAPID keys once. This creates `private_key.pem`, `public_key.pem`,
and prints the browser `applicationServerKey` that must be returned to the
frontend:

```bash
vapid --gen
vapid --applicationServerKey
```

Store them only on the API side:

```env
# Browser-safe applicationServerKey printed by `vapid --applicationServerKey`.
VAPID_PUBLIC_KEY=B...

# PEM file created by `vapid --gen`; keep this private on the API server.
VAPID_PRIVATE_KEY_PATH=/secure/path/private_key.pem
VAPID_SUBJECT=mailto:support@yourdomain.com
```

## FastAPI Models

```python
from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class BrowserPushSubscription(BaseModel):
    endpoint: str
    expirationTime: int | None = None
    keys: PushKeys


class PushSubscriptionCreate(BaseModel):
    subscription: BrowserPushSubscription
    device_uuid: str | None = None
    device_fingerprint: str | None = None
    user_agent: str = ""
    timezone: str = ""


class PushSendPayload(BaseModel):
    title: str = Field(default="Whirlpool Insights")
    body: str
    url: str = "/"
    tag: str = "whirlpool-insights"
```

## VAPID configuration (API)

Load credentials from `mod/push_notification/config.py` (do not duplicate env reads in feature code):

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_PATH`, `VAPID_SUBJECT` — push HTTP routes
- `vapid_send_credentials_optional()` — background sends when VAPID may be unset (skips gracefully)

## FastAPI Routes

```python
import json

from fastapi import APIRouter, Depends, status
from pywebpush import WebPushException, webpush

from mod.push_notification.config import (
    VAPID_PRIVATE_KEY_PATH,
    VAPID_PUBLIC_KEY,
    VAPID_SUBJECT,
)

router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def upsert_push_subscription(
    payload: PushSubscriptionCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Recommended DB columns:
    # user_id, device_uuid, device_fingerprint, endpoint, p256dh, auth,
    # user_agent, timezone, is_active, created_at, updated_at
    await upsert_subscription_by_endpoint(
        db=db,
        user_id=current_user.id,
        device_uuid=payload.device_uuid,
        device_fingerprint=payload.device_fingerprint,
        endpoint=payload.subscription.endpoint,
        p256dh=payload.subscription.keys.p256dh,
        auth=payload.subscription.keys.auth,
        user_agent=payload.user_agent,
        timezone=payload.timezone,
    )
```

## Sending Notifications

Each send creates one `push_notifications` row per target subscription, then updates
that row to `sent` or `failed`. Expired browser subscriptions (`404` / `410`) are
deactivated so future sends skip them.

```python
def send_web_push(db, subscription_row, payload: PushSendPayload):
    notification = create_pending_push_notification(
        db=db,
        user_id=subscription_row.user_id,
        payload=payload,
        push_subscription=subscription_row,
    )
    subscription_info = {
        "endpoint": subscription_row.endpoint,
        "keys": {
            "p256dh": subscription_row.p256dh,
            "auth": subscription_row.auth,
        },
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload.model_dump()),
            vapid_private_key=VAPID_PRIVATE_KEY_PATH,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
    except WebPushException as exc:
        mark_push_notification_failed(notification, exc)
        if exc.response is not None and exc.response.status_code in {404, 410}:
            deactivate_subscription(subscription_row)
        return notification

    mark_push_notification_sent(notification)
    return notification
```

Example targeting a user:

```python
@router.post("/send/user")
def send_user_notification(
    request: Request,
    payload: PushUserSendRequest,
    db=Depends(get_db),
):
    user = get_push_target_user_by_uuid_or_404(db, payload.user_uuid)
    if not current_user_is_superadmin(request) and user.id != request.state.user_id:
        raise HTTPException(
            status_code=403,
            detail="Only superadmin can send notifications to other users",
        )
    subscriptions = list_active_subscriptions_for_user(db, user.id)
    for subscription in subscriptions:
        send_web_push(db, subscription, payload.notification)
    db.commit()
    return {"attempted": len(subscriptions)}
```

Send payload example:

```json
{
  "user_uuid": "0f1a5ee8-10f2-4c78-8173-d2ffdd08c19f",
  "notification": {
    "title": "Inspection Assigned",
    "body": "A new inbound inspection is ready.",
    "url": "/ops/today-inspections",
    "tag": "inspection-assigned",
    "icon": "/icons/icon-192.png",
    "badge": "/icons/badge-72.png",
    "data": {
      "inspection_uuid": "..."
    }
  }
}
```

## Inbound / outbound inspection ready for review

When `POST /api/inspections/inbound` or `POST /api/inspections/outbound` creates an inspection with `review_status` `IN_REVIEW`, the API notifies warehouse-scoped **managers** (who approve or reject inspections; excluding the submitting inspector if they are a manager) via `notify_warehouse_managers_inspection_ready_for_review` in `mod/api/inspection/helper.py`.

Notification tap URL:

```text
/ops/inspections/{inspection_uuid}
```

Push failures are logged only; inspection creation still succeeds. Requires active push subscriptions and VAPID env vars.

Recommended notification storage:

- `push_subscriptions`: current browser/device subscription state, unique by `endpoint`.
- `push_notifications`: outbound notification attempts with `title`, `body`, `url`,
  `tag`, optional `icon` / `badge` / `data`, `status`, `sent_at`, and failure details.

## Service Worker Payload

The frontend service worker reads these fields:

- `title`: Notification title.
- `body`: Notification body.
- `url`: App route to open when the user taps the notification.
- `icon`: Optional icon override.
- `badge`: Optional badge override.
- `tag`: Optional notification grouping tag.
- `data`: Optional extra JSON data.

## Production Notes

- Web Push requires HTTPS except on `localhost`.
- iOS Safari requires the site to be installed as a PWA before push works.
- Android Chrome supports Web Push well with manifest + service worker.
- Never expose `VAPID_PRIVATE_KEY` to the frontend.
- Store subscriptions per device, not only per user.
- Re-save the subscription after login because browser subscriptions can rotate.
- If notification permission is denied, the browser will not show the prompt again unless the user changes site settings.
