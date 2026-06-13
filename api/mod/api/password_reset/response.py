import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from utils.pagination import PaginatedListResponseBase


class PasswordResetRequestItemResponse(BaseModel):
    uuid: uuid.UUID
    attempted_email: EmailStr
    user_uuid: uuid.UUID | None = None
    user_name: str | None = None
    user_email: EmailStr | None = None
    ip_address: str | None = None
    proxy_ip_address: str | None = None
    user_agent: str | None = None
    is_completed: bool
    is_disallowed: bool
    completed_at: datetime | None = None
    expires_at: datetime
    email_sent: bool
    created_at: datetime
    updated_at: datetime


class PasswordResetRequestListResponse(PaginatedListResponseBase):
    data: list[PasswordResetRequestItemResponse] = Field(default_factory=list)
