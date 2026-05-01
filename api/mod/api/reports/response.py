from datetime import date

from pydantic import BaseModel


class OperationsAnalyticsResponse(BaseModel):
    date_from: date | None
    date_to: date | None
    total: int
    total_inbound: int
    total_outbound: int
    total_approved: int
    total_failed: int
    total_pending: int
    success_ratio: float
    failure_ratio: float
    passed: int
    in_review: int
    flagged: int
    logins: int


class OperationsTrendWarehouseItem(BaseModel):
    warehouse_code: str
    warehouse_name: str
    inspections: int
    logins: int
    success_ratio: float


class OperationsTrendBucketItem(BaseModel):
    label: str
    date_from: date
    date_to: date
    inspections: int
    logins: int
    success_ratio: float


class OperationsTrendResponse(BaseModel):
    date_from: date
    date_to: date
    by_warehouse: list[OperationsTrendWarehouseItem]
    weekly_trend: list[OperationsTrendBucketItem]
