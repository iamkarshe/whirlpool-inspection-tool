"""Filter tab options for admin Logs and Job Logs."""

from __future__ import annotations

from sqlalchemy.orm import Session

from mod.api.log.audit import SOURCE_DISPLAY_LABELS
from mod.api.log.response import (
    ApplicationLogFiltersResponse,
    FilterOption,
    JobLogFiltersResponse,
)
from mod.jobs.helper import (
    AUTO_APPROVE_JOB_NAME,
    RESOLVE_PENDING_IP_METADATA_JOB_NAME,
)
from mod.model import JobLog
from mod.tasks.constants import SUPPORTED_TASK_TYPES
from mod.tasks.service import TASK_JOB_LOG_PREFIX

KNOWN_CRON_JOB_NAMES: tuple[str, ...] = (
    AUTO_APPROVE_JOB_NAME,
    RESOLVE_PENDING_IP_METADATA_JOB_NAME,
)


def _humanize_slug(value: str) -> str:
    return value.replace("_", " ").strip().lower()


def _job_name_label(name: str) -> str:
    if name.startswith(TASK_JOB_LOG_PREFIX):
        suffix = name[len(TASK_JOB_LOG_PREFIX) :]
        return f"task {_humanize_slug(suffix)}"
    return _humanize_slug(name)


def build_application_log_filters() -> ApplicationLogFiltersResponse:
    sources = [
        FilterOption(value=code, label=label)
        for code, label in sorted(
            SOURCE_DISPLAY_LABELS.items(),
            key=lambda item: item[1],
        )
    ]
    return ApplicationLogFiltersResponse(sources=sources)


def _known_task_job_log_names() -> list[str]:
    return [f"{TASK_JOB_LOG_PREFIX}{task_type}" for task_type in sorted(SUPPORTED_TASK_TYPES)]


def _distinct_job_log_names(db: Session) -> list[str]:
    rows = (
        db.query(JobLog.job_name)
        .filter(JobLog.is_active.is_(True))
        .distinct()
        .order_by(JobLog.job_name.asc())
        .all()
    )
    return [str(row[0]) for row in rows if row[0]]


def build_job_log_filters(db: Session) -> JobLogFiltersResponse:
    seen: set[str] = set()
    ordered_names: list[str] = []

    for name in (*KNOWN_CRON_JOB_NAMES, *_known_task_job_log_names()):
        if name not in seen:
            seen.add(name)
            ordered_names.append(name)

    for name in _distinct_job_log_names(db):
        if name not in seen:
            seen.add(name)
            ordered_names.append(name)

    job_names = [
        FilterOption(value=name, label=_job_name_label(name))
        for name in ordered_names
    ]
    return JobLogFiltersResponse(job_names=job_names)
