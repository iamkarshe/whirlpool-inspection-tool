from fastapi import APIRouter, Depends, Header, Request
import uuid
from sqlalchemy.orm import Session

from mod.jobs.helper import (
    run_auto_approve_inspections,
    run_resolve_pending_ip_metadata,
    verify_job_execute_token,
)
from mod.jobs.onboard_emails import (
    BULK_ONBOARD_EMAILS_JOB_NAME,
    runBulkOnboardEmails,
)
from mod.jobs.response import (
    BulkOnboardEmailItemResponse,
    BulkOnboardEmailsJobResponse,
    JobExecutionResponse,
)
from mod.api.user.onboard_delivery import listUsersPendingOnboardEmail
from utils.env import is_celery_broker_configured
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


@router.get(
    "/bulk-onboard-emails",
    name="job_bulk_onboard_emails",
    summary="Send welcome onboarding emails to pending users",
    description=(
        "Finds active non-superadmin users with must_change_password=true and no "
        "onboard_email_sent_at (for example after CSV bulk import). Processes users "
        "one at a time with direct SMTP delivery and up to 3 retries per email. "
        "When Celery is configured, work is queued to the worker; otherwise the job "
        "runs inline in this request."
    ),
    response_model=BulkOnboardEmailsJobResponse,
    responses={
        200: {
            "description": "Bulk onboard email job result or enqueue acknowledgement.",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/BulkOnboardEmailsJobResponse"
                    },
                }
            },
        },
        401: {"description": "Missing or invalid x-job-execute-token."},
        503: {"description": "JOB_EXECUTE_TOKEN not configured."},
    },
)
@exception_handler_decorator
def job_bulk_onboard_emails(
    request: Request,
    _: None = Depends(require_job_token),
    db: Session = Depends(get_db),
) -> BulkOnboardEmailsJobResponse:
    pending_users = listUsersPendingOnboardEmail(db)
    pending_count = len(pending_users)
    if pending_count == 0:
        return BulkOnboardEmailsJobResponse(
            job_name=BULK_ONBOARD_EMAILS_JOB_NAME,
            pending_count=0,
            sent_count=0,
            failed_count=0,
            message="No users pending onboarding email.",
            logged=False,
            enqueued=False,
            results=[],
        )

    if is_celery_broker_configured():
        from mod.jobs.celery_tasks import bulk_onboard_emails_task

        bulk_onboard_emails_task.delay()
        return BulkOnboardEmailsJobResponse(
            job_name=BULK_ONBOARD_EMAILS_JOB_NAME,
            pending_count=pending_count,
            sent_count=0,
            failed_count=0,
            message=(
                f"Queued bulk onboard email job for {pending_count} user(s). "
                "Check job_logs after the worker finishes."
            ),
            logged=False,
            enqueued=True,
            results=[],
        )

    result = runBulkOnboardEmails(db)
    return BulkOnboardEmailsJobResponse(
        job_name=result.job_name,
        pending_count=result.pending_count,
        sent_count=result.sent_count,
        failed_count=result.failed_count,
        message=result.message,
        logged=result.logged,
        enqueued=False,
        results=[
            BulkOnboardEmailItemResponse(
                user_uuid=uuid.UUID(item.user_uuid),
                email=item.email,
                name=item.name,
                welcome_email_sent=item.welcome_email_sent,
                error=item.error,
            )
            for item in result.results
        ],
    )
