import uuid
from typing import Any

from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str = Field(..., min_length=1)
    auth: str = Field(..., min_length=1)


class BrowserPushSubscription(BaseModel):
    endpoint: str = Field(..., min_length=1, max_length=2048)
    expirationTime: int | None = None
    keys: PushKeys


class PushSubscriptionCreate(BaseModel):
    subscription: BrowserPushSubscription
    device_uuid: str | None = None
    device_fingerprint: str | None = None
    user_agent: str = Field(default="", max_length=2000)
    timezone: str = Field(default="", max_length=64)


class PushSendPayload(BaseModel):
    title: str = Field(default="Whirlpool Insights", max_length=200)
    body: str = Field(..., min_length=1)
    url: str = Field(default="/", max_length=1024)
    tag: str = Field(default="whirlpool-insights", max_length=128)
    icon: str | None = Field(default=None, max_length=1024)
    badge: str | None = Field(default=None, max_length=1024)
    data: dict[str, Any] | None = None


class PushUserSendRequest(BaseModel):
    user_uuid: uuid.UUID
    notification: PushSendPayload
