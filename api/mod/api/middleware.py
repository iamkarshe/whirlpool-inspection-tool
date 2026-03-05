from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.model import User
from utils.db import get_db
from utils.jwt import verify_access_token


async def auth_dependency(
    request: Request,
    db: Session = Depends(get_db),
):
    """Dependency to authenticate the current user and attach it to request.state."""
    user_id = verify_access_token(request)

    try:
        user = (
            db.query(User)
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
    request.state.role = getattr(user.role, "role", None)
