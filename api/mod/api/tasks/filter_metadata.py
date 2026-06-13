"""Filter tab options for background Tasks."""

from __future__ import annotations

from mod.api.log.response import FilterOption
from mod.api.tasks.response import TaskFiltersResponse
from mod.tasks.constants import SUPPORTED_TASK_TYPES

TASK_TYPE_LABELS: dict[str, str] = {
    "send_email": "send email",
    "notify_inspection_review_managers": "inspection review notifications",
    "resolve_ip_metadata": "resolve ip metadata",
    "generate_report": "generate report",
    "process_file": "process file",
    "send_webhook": "send webhook",
}


def _humanize_slug(value: str) -> str:
    return value.replace("_", " ").strip().lower()


def build_task_filters() -> TaskFiltersResponse:
    task_types = [
        FilterOption(
            value=task_type,
            label=TASK_TYPE_LABELS.get(task_type, _humanize_slug(task_type)),
        )
        for task_type in sorted(SUPPORTED_TASK_TYPES)
    ]
    return TaskFiltersResponse(task_types=task_types)
