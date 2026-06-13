import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.tasks.filter_metadata import build_task_filters
from mod.api.tasks.helper import (
    list_recent_tasks,
    map_task_detail,
    queue_sample_send_email_task,
    queue_task,
)
from mod.api.tasks.request import SampleSendEmailRequest, TaskCreateRequest
from mod.api.tasks.response import (
    TaskCreateResponse,
    TaskDetailResponse,
    TaskFiltersResponse,
    TaskListResponse,
)
from mod.tasks.service import get_task_by_uuid_or_404
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator

TASK_API_ROLES = ["superadmin"]

router = APIRouter(
    tags=["Tasks"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/tasks",
    name="list_tasks",
    summary="List recent background tasks",
    description=(
        "Returns the 50 most recently created tasks, newest first. "
        "Optional filters: task_type, status (see GET /api/tasks/filters)."
    ),
    response_model=TaskListResponse,
    responses={403: {"description": "Caller is not superadmin."}},
)
@exception_handler_decorator
@check_api_role(TASK_API_ROLES)
def list_tasks(
    request: Request,
    task_type: str | None = Query(
        None,
        description="Filter by task_type (e.g. send_email).",
    ),
    status: str | None = Query(
        None,
        description="Filter by status: queued, processing, completed, failed, retrying, cancelled.",
    ),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    return list_recent_tasks(db, task_type=task_type, status=status)


@router.get(
    "/tasks/filters",
    name="get_task_filters",
    summary="Task type filter tabs",
    description=(
        "Returns task_type values for segmented filter tabs on the Tasks page. "
        "Pass value to GET /api/tasks?task_type=."
    ),
    response_model=TaskFiltersResponse,
    responses={403: {"description": "Caller is not superadmin."}},
)
@exception_handler_decorator
@check_api_role(TASK_API_ROLES)
def get_task_filters(request: Request) -> TaskFiltersResponse:
    return build_task_filters()


@router.post(
    "/tasks",
    name="create_task",
    summary="Queue a background task",
    response_model=TaskCreateResponse,
)
@exception_handler_decorator
@check_api_role(TASK_API_ROLES)
def create_task(
    request: Request,
    body: TaskCreateRequest,
    db: Session = Depends(get_db),
) -> TaskCreateResponse:
    created_by = getattr(request.state, "user_email", None)
    return queue_task(db, body, created_by=created_by)


@router.post(
    "/tasks/sample-send-email",
    name="queue_sample_send_email_task",
    summary="Queue a sample send_email background task",
    description=(
        "Uses configured SMTP credentials (credential_key default_smtp) "
        "and returns task_uuid immediately."
    ),
    response_model=TaskCreateResponse,
)
@exception_handler_decorator
@check_api_role(TASK_API_ROLES)
def queue_sample_send_email(
    request: Request,
    body: SampleSendEmailRequest,
    db: Session = Depends(get_db),
) -> TaskCreateResponse:
    created_by = getattr(request.state, "user_email", None)
    return queue_sample_send_email_task(db, body, created_by=created_by)


@router.get(
    "/tasks/{task_uuid}",
    name="get_task",
    summary="Get background task status and result",
    description=(
        "Returns task status, timing, result flags, and display_fields "
        "as tagged rows for React detail screens."
    ),
    response_model=TaskDetailResponse,
)
@exception_handler_decorator
@check_api_role(TASK_API_ROLES)
def get_task(
    request: Request,
    task_uuid: uuid.UUID,
    db: Session = Depends(get_db),
) -> TaskDetailResponse:
    task = get_task_by_uuid_or_404(db, task_uuid)
    return map_task_detail(task)
