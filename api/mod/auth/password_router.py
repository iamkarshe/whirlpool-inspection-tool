from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.auth.helper import get_request_client_context
from mod.auth.password_change_helper import process_change_password
from mod.auth.request import ChangePasswordRequest
from mod.auth.response import ChangePasswordResponse, HttpDetailErrorResponse
from mod.model import User
from utils.db import get_db

router = APIRouter(
    tags=["Auth"],
    prefix="/auth",
    dependencies=[Depends(auth_dependency)],
)


@router.post(
    "/change-password",
    name="change_password",
    summary="Change password",
    description=(
        "Authenticated password change for onboarding temp passwords and periodic "
        "rotation. Validates zxcvbn strength and rejects reuse of the current or last "
        "3 passwords. Clears must_change_password and password_expired flags."
    ),
    response_model=ChangePasswordResponse,
    responses={
        401: {
            "description": "Current password is incorrect.",
            "model": HttpDetailErrorResponse,
        },
        422: {
            "description": "Validation failed, weak password, or password reuse.",
            "model": HttpDetailErrorResponse,
        },
    },
)
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    ctx = get_request_client_context(request)
    message = process_change_password(
        db,
        user=user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        confirm_password=payload.confirm_password,
        ctx=ctx,
        change_reason="user_initiated",
    )
    return ChangePasswordResponse(message=message)
