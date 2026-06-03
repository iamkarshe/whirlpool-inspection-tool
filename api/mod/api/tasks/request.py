from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from mod.tasks.constants import (
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_TASK_QUEUE,
    MAX_MAX_ATTEMPTS,
    MIN_MAX_ATTEMPTS,
    SUPPORTED_TASK_TYPES,
)


class TaskCreateRequest(BaseModel):
    task_type: str = Field(..., min_length=1, max_length=100)
    payload: dict[str, Any] = Field(default_factory=dict)
    queue_name: str = Field(default=DEFAULT_TASK_QUEUE, max_length=100)
    max_attempts: int = Field(default=DEFAULT_MAX_ATTEMPTS, ge=MIN_MAX_ATTEMPTS, le=MAX_MAX_ATTEMPTS)

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in SUPPORTED_TASK_TYPES:
            raise ValueError(
                f"task_type must be one of: {', '.join(sorted(SUPPORTED_TASK_TYPES))}"
            )
        return normalized


class SampleSendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str = Field(
        default="Whirlpool Inspection Tool — sample background email",
        max_length=500,
    )
    body_text: str = Field(
        default="This message was sent via the background task queue.",
        max_length=8000,
    )
    body_html: str | None = Field(default=None, max_length=16000)
    credential_key: str = Field(default="default_smtp", max_length=64)
    queue_name: str = Field(default=DEFAULT_TASK_QUEUE, max_length=100)

    @model_validator(mode="after")
    def validate_body_present(self) -> "SampleSendEmailRequest":
        if not str(self.body_text or "").strip() and not str(self.body_html or "").strip():
            raise ValueError("body_text or body_html is required")
        return self
