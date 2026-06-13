import uuid
from datetime import datetime
from typing import Any, List

from pydantic import BaseModel, Field


class ApplicationLogItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    level: str = Field(..., description="INFO, WARN, or ERROR.")
    message: str
    source: str = Field(
        ...,
        description=(
            "AUTH, USER ADD, USER ONBOARD, USER UPDATE, MASTER UPDATE, "
            "INTEGRATION KEY UPDATED, or EMAIL."
        ),
    )
    details: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Structured audit payload. Email logs include to_email, subject, "
            "body_text, and body_html for SuperAdmin debugging."
        ),
    )
    created_at: datetime = Field(..., description="Event time (UTC).")


class ApplicationLogListResponse(BaseModel):
    data: List[ApplicationLogItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class JobLogItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    job_name: str
    status: str = Field(..., description="success or failed.")
    rows_updated: int
    message: str | None = None
    metadata: dict | None = Field(
        default=None,
        description="Structured context (task_uuid, thresholds, login correlation, etc.).",
    )
    created_at: datetime


class JobLogListResponse(BaseModel):
    data: List[JobLogItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
