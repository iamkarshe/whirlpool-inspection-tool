import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TaskCreateResponse(BaseModel):
    success: bool = True
    task_uuid: uuid.UUID
    status: str


class TaskStatusResponse(BaseModel):
    uuid: uuid.UUID
    task_type: str
    status: str
    progress_percent: int
    progress_message: str | None = None
    attempts: int
    max_attempts: int
    result: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskResultResponse(BaseModel):
    success: bool
    task_uuid: uuid.UUID
    status: str
    result: dict[str, Any] | None = None
    message: str | None = Field(
        default=None,
        description="Present when result is not ready yet.",
    )
