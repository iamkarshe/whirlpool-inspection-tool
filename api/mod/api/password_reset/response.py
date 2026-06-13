import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from utils.pagination import PaginatedListResponseBase


class PasswordResetRequestItemResponse(BaseModel):
    uuid: uuid.UUID
    attempted_email: EmailStr
    user_uuid: uuid.UUID | None = Field(
        default=None,
        description="Linked user when the email matched an account.",
    )
    user_name: str | None = None
    user_email: EmailStr | None = None
    ip_address: str | None = Field(
        default=None,
        description="Client IP observed on the forgot-password request.",
    )
    proxy_ip_address: str | None = None
    user_agent: str | None = None
    is_completed: bool = Field(
        description="True when the user completed POST /auth/reset-password with this token.",
    )
    is_disallowed: bool = Field(
        description=(
            "True when no token was issued (superadmin, unknown user, inactive, "
            "invalid role, or IP already blocked)."
        ),
    )
    completed_at: datetime | None = None
    expires_at: datetime
    email_sent: bool = Field(
        description="True when a reset email was queued or sent for this request.",
    )
    created_at: datetime
    updated_at: datetime


class PasswordResetRequestListResponse(PaginatedListResponseBase):
    data: list[PasswordResetRequestItemResponse] = Field(default_factory=list)
