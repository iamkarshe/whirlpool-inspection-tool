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
    title: str = Field(default="Whirlpool Insights")
    body: str
    url: str = "/"
    tag: str = "whirlpool-insights"
