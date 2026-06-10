from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from mod.jobs.helper import (
    run_auto_approve_inspections,
    run_resolve_pending_ip_metadata,
    verify_job_execute_token,
)
from mod.jobs.response import JobExecutionResponse
from utils.db import get_db
from utils.decorator import exception_handler_decorator

router = APIRouter(tags=["Jobs"], prefix="/jobs")

JOB_TOKEN_HEADER = "x-job-execute-token"


def require_job_token(
    x_job_execute_token: str | None = Header(
        None,
        alias=JOB_TOKEN_HEADER,
        description="Shared secret from JOB_EXECUTE_TOKEN env var.",
    ),
) -> None:
    verify_job_execute_token(x_job_execute_token)


@router.get(
    "/auto-approve-inspections",
    name="job_auto_approve_inspections",
    summary="Auto-approve stale inspections",
    description=(
        "Approves active inspections still in PENDING or IN_REVIEW when "
        "created more than AUTO_APPROVE_INSPECTION_HOURS ago (default 6). "
        "Sets is_auto_approved and reviewed_comment. "
        "Also runs every 15 minutes via Celery beat when the worker uses --beat."
    ),
    response_model=JobExecutionResponse,
    responses={
        401: {"description": "Missing or invalid x-job-execute-token."},
        503: {"description": "JOB_EXECUTE_TOKEN not configured."},
    },
)
@exception_handler_decorator
def job_auto_approve_inspections(
    request: Request,
    _: None = Depends(require_job_token),
    db: Session = Depends(get_db),
) -> JobExecutionResponse:
    result = run_auto_approve_inspections(db)
    return JobExecutionResponse(
        job_name=result.job_name,
        rows_updated=result.rows_updated,
        message=result.message,
        logged=result.logged,
    )


@router.get(
    "/resolve-pending-ip-metadata",
    name="job_resolve_pending_ip_metadata",
    summary="Enqueue IP geolocation lookups for unresolved addresses",
    description=(
        "Scans login audit logs for client IPs, ensures rows exist in "
        "ip_address_metadata, and enqueues Celery resolve_ip_metadata tasks for "
        "pending or failed lookups (batch size IP_GEO_BATCH_LIMIT). "
        "Also runs on a Celery beat schedule when the worker uses --beat."
    ),
    response_model=JobExecutionResponse,
    responses={
        401: {"description": "Missing or invalid x-job-execute-token."},
        503: {"description": "JOB_EXECUTE_TOKEN not configured."},
    },
)
@exception_handler_decorator
def job_resolve_pending_ip_metadata(
    request: Request,
    _: None = Depends(require_job_token),
    db: Session = Depends(get_db),
) -> JobExecutionResponse:
    result = run_resolve_pending_ip_metadata(db)
    return JobExecutionResponse(
        job_name=result.job_name,
        rows_updated=result.rows_updated,
        message=result.message,
        logged=result.logged,
    )
