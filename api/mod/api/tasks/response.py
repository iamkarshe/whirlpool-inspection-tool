import uuid
from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from mod.api.log.response import FilterOption

TaskDisplayGroup = Literal["status", "timing", "result", "error", "payload"]


class TaskDisplayField(BaseModel):
    tag: str = Field(..., description="Human-readable label for the UI.")
    key: str = Field(..., description="Stable identifier for React list keys.")
    value: str = Field(..., description="Pre-formatted value safe to render as text.")
    group: TaskDisplayGroup = Field(
        default="status",
        description="Section hint: status, timing, result, error, or payload.",
    )


class TaskListItemResponse(BaseModel):
    uuid: uuid.UUID
    task_type: str
    status: str
    queue_name: str | None = None
    created_by: str | None = None
    progress_percent: int
    progress_message: str | None = None
    attempts: int
    max_attempts: int
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskDetailResponse(BaseModel):
    uuid: uuid.UUID
    task_type: str
    status: str
    queue_name: str | None = None
    created_by: str | None = None
    progress_percent: int
    progress_message: str | None = None
    attempts: int
    max_attempts: int
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    failed_at: datetime | None = None
    result_ready: bool = Field(
        ...,
        description="True when the task reached a terminal state (completed, failed, cancelled).",
    )
    result_success: bool = Field(
        ...,
        description="True only when status is completed and the handler finished successfully.",
    )
    result_message: str | None = Field(
        default=None,
        description="Short summary when the result is not ready or the task failed.",
    )
    display_fields: List[TaskDisplayField] = Field(
        default_factory=list,
        description="Ordered label/value rows for React detail views.",
    )


class TaskCreateResponse(BaseModel):
    success: bool = True
    task_uuid: uuid.UUID
    status: str


class TaskListResponse(BaseModel):
    data: List[TaskListItemResponse]
    total: int = Field(..., description="Number of tasks returned (at most 50).")


class TaskFiltersResponse(BaseModel):
    task_types: List[FilterOption] = Field(
        ...,
        description="Tab options for GET /api/tasks?task_type=.",
    )
