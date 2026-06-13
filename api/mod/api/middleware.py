from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from mod.auth.session import verify_request_access_token
from mod.model import User
from utils.db import get_db
from utils.password_policy import (
    auth_path_exempt_from_password_policy,
    requires_password_change,
)


async def auth_dependency(
    request: Request,
    db: Session = Depends(get_db),
):
    """Dependency to authenticate the current user and attach it to request.state."""
    user_id = verify_request_access_token(db, request)

    try:
        user = (
            db.query(User)
            .options(joinedload(User.role))
            .filter(
                User.id == int(user_id),
                User.is_active.is_(True),
            )
            .first()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    request.state.user_id = user.id
    request.state.user_email = user.email
    request.state.role = user.role.role if user.role is not None else None

    if not auth_path_exempt_from_password_policy(request.url.path):
        if requires_password_change(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required before using the application.",
            )
