"""Application audit logs and cron job logs (superadmin)."""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from mod.api.log.helper import (
    apply_application_log_level_filter,
    apply_application_log_source_filter,
    map_application_log_item,
    map_job_log_item,
)
from mod.api.log.response import ApplicationLogListResponse, JobLogListResponse
from mod.api.middleware import auth_dependency
from mod.model import JobLog, JobLogStatus, Log
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Logs"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/logs/job",
    name="get_job_logs",
    summary="List job logs",
    description=(
        "Paginated cron job outcomes (failures and runs that updated rows). "
        "Filter by date_field=created_at, search, status, and job_name sort."
    ),
    response_model=JobLogListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_job_logs(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    status: str | None = Query(
        None,
        description="Filter by job status: success or failed.",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(JobLog).filter(JobLog.is_active.is_(True))

    if status is not None:
        normalized = status.strip().lower()
        if normalized == JobLogStatus.success.value:
            query = query.filter(JobLog.status == JobLogStatus.success)
        elif normalized == JobLogStatus.failed.value:
            query = query.filter(JobLog.status == JobLogStatus.failed)

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[JobLog.job_name, JobLog.message],
        date_fields={
            "created_at": JobLog.created_at,
            "updated_at": JobLog.updated_at,
        },
        sort_fields={
            "id": JobLog.id,
            "job_name": JobLog.job_name,
            "status": JobLog.status,
            "rows_updated": JobLog.rows_updated,
            "created_at": JobLog.created_at,
            "updated_at": JobLog.updated_at,
        },
        default_sort_field="created_at",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_job_log_item,
    )


@router.get(
    "/logs",
    name="get_application_logs",
    summary="List application logs",
    description=(
        "Paginated application and audit logs for the admin Logs page. "
        "Supports search, date range on created_at, level, and source filters."
    ),
    response_model=ApplicationLogListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_application_logs(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    level: str | None = Query(
        None,
        description="Filter by level: info, warn, or error (case insensitive).",
    ),
    source: str | None = Query(
        None,
        description=(
            "Filter by source: AUTH, USER ADD, USER UPDATE, MASTER UPDATE, "
            "INTEGRATION KEY UPDATED (spaces optional)."
        ),
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Log).filter(Log.is_active.is_(True))
    query = apply_application_log_level_filter(query, level)
    query = apply_application_log_source_filter(query, source)

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Log.log_value],
        date_fields={
            "created_at": Log.created_at,
            "updated_at": Log.updated_at,
        },
        sort_fields={
            "id": Log.id,
            "level": Log.log_level,
            "message": Log.log_value,
            "source": Log.id,
            "created_at": Log.created_at,
            "updated_at": Log.updated_at,
            "time": Log.created_at,
        },
        default_sort_field="created_at",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_application_log_item,
    )
