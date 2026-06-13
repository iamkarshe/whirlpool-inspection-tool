from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.api.password_reset.helper import map_password_reset_request_item
from mod.api.password_reset.response import PasswordResetRequestListResponse
from mod.model import PasswordResetRequest
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Password reset"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/password-reset-requests",
    name="get_password_reset_requests",
    summary="List password reset requests",
    description=(
        "Paginated forgot-password audit for superadmin. "
        "Supports search on email/IP, sort, and created_at date filters."
    ),
    response_model=PasswordResetRequestListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_password_reset_requests(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_completed: bool | None = Query(
        None,
        description="Filter by completion status.",
    ),
    is_disallowed: bool | None = Query(
        None,
        description="Filter by disallowed status (no token/email issued).",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(PasswordResetRequest).options(
        joinedload(PasswordResetRequest.user)
    )

    if is_completed is not None:
        query = query.filter(PasswordResetRequest.is_completed.is_(is_completed))

    if is_disallowed is not None:
        query = query.filter(PasswordResetRequest.is_disallowed.is_(is_disallowed))

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[
            PasswordResetRequest.attempted_email,
            PasswordResetRequest.ip_address,
        ],
        date_fields={"created_at": PasswordResetRequest.created_at},
        sort_fields={
            "id": PasswordResetRequest.id,
            "created_at": PasswordResetRequest.created_at,
            "attempted_email": PasswordResetRequest.attempted_email,
            "is_completed": PasswordResetRequest.is_completed,
            "is_disallowed": PasswordResetRequest.is_disallowed,
        },
        default_sort_field="created_at",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=lambda row: map_password_reset_request_item(row, row.user),
    )
