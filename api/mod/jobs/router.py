from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from mod.jobs.helper import run_auto_approve_inspections, verify_job_execute_token
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
        "Sets is_auto_approved and reviewed_comment. Intended for Ubuntu crontab."
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
