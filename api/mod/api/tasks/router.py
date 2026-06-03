import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.tasks.helper import (
    get_task_by_uuid_or_404,
    map_task_result,
    map_task_status,
    queue_sample_send_email_task,
    queue_task,
)
from mod.api.tasks.request import SampleSendEmailRequest, TaskCreateRequest
from mod.api.tasks.response import (
    TaskCreateResponse,
    TaskResultResponse,
    TaskStatusResponse,
)
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator

router = APIRouter(
    tags=["Tasks"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.post(
    "/tasks",
    name="create_task",
    summary="Queue a background task",
    response_model=TaskCreateResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
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
@check_api_role(["superadmin", "manager"])
def queue_sample_send_email(
    request: Request,
    body: SampleSendEmailRequest,
    db: Session = Depends(get_db),
) -> TaskCreateResponse:
    created_by = getattr(request.state, "user_email", None)
    return queue_sample_send_email_task(db, body, created_by=created_by)


@router.get(
    "/tasks/{task_uuid}",
    name="get_task_status",
    summary="Get background task status",
    response_model=TaskStatusResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_task_status(
    request: Request,
    task_uuid: uuid.UUID,
    db: Session = Depends(get_db),
) -> TaskStatusResponse:
    task = get_task_by_uuid_or_404(db, task_uuid)
    return map_task_status(task)


@router.get(
    "/tasks/{task_uuid}/result",
    name="get_task_result",
    summary="Get background task result",
    response_model=TaskResultResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_task_result(
    request: Request,
    task_uuid: uuid.UUID,
    db: Session = Depends(get_db),
) -> TaskResultResponse:
    task = get_task_by_uuid_or_404(db, task_uuid)
    return map_task_result(task)
