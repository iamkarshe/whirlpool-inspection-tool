import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.reports.helper import (
    operations_analytics_counts,
    operations_trend_data,
    resolve_scope_codes,
)
from mod.api.reports.response import (
    OperationsAnalyticsResponse,
    OperationsTrendResponse,
)
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator

router = APIRouter(
    tags=["Reports"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/reports/operations-analytics",
    name="get_operations_analytics",
    response_model=OperationsAnalyticsResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_operations_analytics(
    request: Request,
    date_from: date | None = Query(None, description="Range start date (UTC)"),
    date_to: date | None = Query(None, description="Range end date (UTC, inclusive)"),
    warehouse_uuid: uuid.UUID | None = Query(None),
    plant_uuid: uuid.UUID | None = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    if (date_from is None) ^ (date_to is None):
        raise HTTPException(
            status_code=400,
            detail="date_from and date_to must both be set or both omitted",
        )
    if date_from is not None and date_to is not None and date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )

    warehouse_code, plant_code = resolve_scope_codes(db, warehouse_uuid, plant_uuid)
    counts = operations_analytics_counts(
        db,
        is_active=is_active,
        date_from=date_from,
        date_to=date_to,
        warehouse_code=warehouse_code,
        plant_code=plant_code,
    )
    return OperationsAnalyticsResponse(
        date_from=date_from,
        date_to=date_to,
        **counts,
    )


@router.get(
    "/reports/operations-trend",
    name="get_operations_trend",
    response_model=OperationsTrendResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_operations_trend(
    request: Request,
    date_from: date = Query(..., description="Range start date (UTC)"),
    date_to: date = Query(..., description="Range end date (UTC, inclusive)"),
    warehouse_uuid: uuid.UUID | None = Query(None),
    plant_uuid: uuid.UUID | None = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_code, plant_code = resolve_scope_codes(db, warehouse_uuid, plant_uuid)
    payload = operations_trend_data(
        db,
        date_from=date_from,
        date_to=date_to,
        is_active=is_active,
        warehouse_code=warehouse_code,
        plant_code=plant_code,
    )
    return OperationsTrendResponse(**payload)
