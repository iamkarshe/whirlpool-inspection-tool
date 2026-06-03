"""Cron job runners and job_logs persistence."""

from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.model import (
    Inspection,
    InspectionReviewEvent,
    InspectionReviewStatus,
    JobLog,
    JobLogStatus,
    Role,
    User,
)
from utils.env import get_auto_approve_inspection_hours, get_job_execute_token

AUTO_APPROVE_JOB_NAME = "auto_approve_inspections"
def auto_approve_review_comment(hours: int) -> str:
    return (
        f"Automatically approved after {hours} hours with no manual review."
    )

PENDING_REVIEW_STATUSES = (
    InspectionReviewStatus.PENDING,
    InspectionReviewStatus.IN_REVIEW,
)


@dataclass
class JobRunResult:
    job_name: str
    rows_updated: int
    message: str
    logged: bool


def verify_job_execute_token(header_value: str | None) -> None:
    expected = get_job_execute_token()
    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JOB_EXECUTE_TOKEN is not configured",
        )
    if not header_value or not secrets.compare_digest(header_value, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing x-job-execute-token",
        )


def get_job_actor_user_id(db: Session) -> int:
    user = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(
            Role.role == "superadmin",
            User.is_active.is_(True),
        )
        .order_by(User.id.asc())
        .first()
    )
    if user is None:
        raise RuntimeError("No active superadmin user available for job actor")
    return int(user.id)


def should_persist_job_log(*, status: JobLogStatus, rows_updated: int) -> bool:
    return status == JobLogStatus.failed or rows_updated >= 1


def persist_job_log(
    db: Session,
    *,
    job_name: str,
    status: JobLogStatus,
    rows_updated: int,
    message: str,
    metadata: dict | None = None,
) -> bool:
    if not should_persist_job_log(status=status, rows_updated=rows_updated):
        return False
    db.add(
        JobLog(
            uuid=uuid.uuid4(),
            job_name=job_name,
            status=status,
            rows_updated=rows_updated,
            message=message[:4000] if message else None,
            metadata_json=metadata,
            is_active=True,
        )
    )
    db.commit()
    return True


def run_auto_approve_inspections(db: Session) -> JobRunResult:
    job_name = AUTO_APPROVE_JOB_NAME
    rows_updated = 0
    try:
        actor_user_id = get_job_actor_user_id(db)
        hours = get_auto_approve_inspection_hours()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        now = datetime.now(timezone.utc)
        comment = auto_approve_review_comment(hours)

        candidate_ids = [
            row[0]
            for row in db.query(Inspection.id)
            .filter(
                Inspection.is_active.is_(True),
                Inspection.created_at <= cutoff,
                Inspection.review_status.in_(PENDING_REVIEW_STATUSES),
            )
            .all()
        ]

        for inspection_id in candidate_ids:
            inspection = (
                db.query(Inspection)
                .filter(Inspection.id == inspection_id)
                .with_for_update()
                .first()
            )
            if inspection is None:
                continue
            if inspection.review_status not in PENDING_REVIEW_STATUSES:
                continue
            if inspection.created_at > cutoff:
                continue

            from_status = inspection.review_status
            db.add(
                InspectionReviewEvent(
                    inspection_id=inspection.id,
                    from_status=from_status,
                    to_status=InspectionReviewStatus.APPROVED,
                    actor_user_id=actor_user_id,
                    comment=comment,
                )
            )
            inspection.review_status = InspectionReviewStatus.APPROVED
            inspection.is_auto_approved = True
            inspection.is_under_review = False
            inspection.reviewer_id = actor_user_id
            inspection.reviewed_at = now
            inspection.reviewed_comment = comment
            rows_updated += 1

        db.commit()
        message = f"Auto-approved {rows_updated} inspection(s) older than {hours} hour(s)."
        logged = persist_job_log(
            db,
            job_name=job_name,
            status=JobLogStatus.success,
            rows_updated=rows_updated,
            message=message,
            metadata={
                "hours_threshold": hours,
                "candidate_count": len(candidate_ids),
            },
        )
        return JobRunResult(
            job_name=job_name,
            rows_updated=rows_updated,
            message=message,
            logged=logged,
        )
    except Exception as exc:
        db.rollback()
        message = str(exc)
        logged = persist_job_log(
            db,
            job_name=job_name,
            status=JobLogStatus.failed,
            rows_updated=rows_updated,
            message=message,
            metadata={"error_type": exc.__class__.__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=message,
        ) from exc
