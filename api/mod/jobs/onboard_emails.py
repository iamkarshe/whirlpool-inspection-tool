"""Bulk onboarding email job — one user at a time with SMTP retries."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.user.onboard_delivery import (
    DEFAULT_ONBOARD_EMAIL_MAX_ATTEMPTS,
    DEFAULT_ONBOARD_EMAIL_RETRY_DELAY_SECONDS,
    deliverUserOnboarding,
    listUsersPendingOnboardEmail,
)
from mod.jobs.helper import get_job_actor_user_id, persist_job_log
from mod.model import JobLogStatus

BULK_ONBOARD_EMAILS_JOB_NAME = "bulk_onboard_emails"


@dataclass(frozen=True)
class BulkOnboardEmailItemResult:
    user_uuid: str
    email: str
    name: str
    welcome_email_sent: bool
    error: str | None = None


@dataclass(frozen=True)
class BulkOnboardEmailsResult:
    job_name: str
    pending_count: int
    sent_count: int
    failed_count: int
    message: str
    logged: bool
    results: list[BulkOnboardEmailItemResult]


def executeBulkOnboardEmails(db: Session) -> BulkOnboardEmailsResult:
    job_name = BULK_ONBOARD_EMAILS_JOB_NAME
    pending_users = listUsersPendingOnboardEmail(db)
    actor_user_id = get_job_actor_user_id(db)
    results: list[BulkOnboardEmailItemResult] = []
    sent_count = 0
    failed_count = 0

    for user in pending_users:
        try:
            outcome = deliverUserOnboarding(
                db,
                user_uuid=user.uuid,
                actor_user_id=actor_user_id,
                email_max_attempts=DEFAULT_ONBOARD_EMAIL_MAX_ATTEMPTS,
                email_retry_delay_seconds=DEFAULT_ONBOARD_EMAIL_RETRY_DELAY_SECONDS,
            )
            db.commit()
            if outcome.welcome_email_sent:
                sent_count += 1
                results.append(
                    BulkOnboardEmailItemResult(
                        user_uuid=str(user.uuid),
                        email=user.email,
                        name=user.name,
                        welcome_email_sent=True,
                    )
                )
            else:
                failed_count += 1
                results.append(
                    BulkOnboardEmailItemResult(
                        user_uuid=str(user.uuid),
                        email=user.email,
                        name=user.name,
                        welcome_email_sent=False,
                        error="Welcome email delivery failed after retries",
                    )
                )
        except Exception as exc:
            db.rollback()
            failed_count += 1
            results.append(
                BulkOnboardEmailItemResult(
                    user_uuid=str(user.uuid),
                    email=user.email,
                    name=user.name,
                    welcome_email_sent=False,
                    error=str(exc),
                )
            )

    message = (
        f"Bulk onboard emails finished: {sent_count} sent, {failed_count} failed, "
        f"{len(pending_users)} pending at start."
    )
    logged = persist_job_log(
        db,
        job_name=job_name,
        status=JobLogStatus.failed
        if failed_count and not sent_count
        else JobLogStatus.success,
        rows_updated=sent_count,
        message=message,
        metadata={
            "pending_count": len(pending_users),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "results": [
                {
                    "user_uuid": item.user_uuid,
                    "email": item.email,
                    "name": item.name,
                    "welcome_email_sent": item.welcome_email_sent,
                    "error": item.error,
                }
                for item in results
            ],
        },
    )
    return BulkOnboardEmailsResult(
        job_name=job_name,
        pending_count=len(pending_users),
        sent_count=sent_count,
        failed_count=failed_count,
        message=message,
        logged=logged,
        results=results,
    )


def runBulkOnboardEmails(db: Session) -> BulkOnboardEmailsResult:
    try:
        return executeBulkOnboardEmails(db)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
