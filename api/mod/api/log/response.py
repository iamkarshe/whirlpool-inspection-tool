import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ApplicationLogItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    level: str = Field(..., description="INFO, WARN, or ERROR.")
    message: str
    source: str = Field(
        ...,
        description="AUTH, DEVICES, INSPECTIONS, MASTERS, REPORTS, or STORAGE.",
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
    created_at: datetime


class JobLogListResponse(BaseModel):
    data: List[JobLogItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
