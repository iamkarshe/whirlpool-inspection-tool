import datetime
import uuid
from typing import Any

import jwt
from fastapi import HTTPException, Query, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from utils.env import get_env
from utils.log import debug_rich_console

SECRET_KEY = str(get_env("JWT_SECRET"))
ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

security = HTTPBearer()


def _jwt_expiry() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        hours=JWT_EXPIRY_HOURS
    )


def create_access_token(
    user_id: int,
    *,
    device_id: int | None = None,
) -> tuple[str, str, datetime.datetime]:
    """Generate JWT with jti for server-side session revocation."""
    jti = uuid.uuid4().hex
    expires_at = _jwt_expiry()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "jti": jti,
        "exp": expires_at,
    }
    if device_id is not None:
        payload["device_id"] = device_id

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti, expires_at


def decode_access_token_payload(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        debug_rich_console()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token, authentication failed",
        )
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return payload


def verify_access_token(request: Request = Security(security)) -> int:
    """Verify JWT token and return user ID (legacy; prefer auth_dependency)."""
    token = request.headers.get("Authorization")
    token = token[7:] if token and token.lower().startswith("bearer ") else token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Missing token",
        )

    payload = decode_access_token_payload(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Invalid token: No user ID found",
        )
    return int(user_id)


def verify_access_token_http(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Verify JWT token and return user ID."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="[verify_access_token_http] Invalid token: No user ID found",
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token_http] Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token_http] Invalid token, authentication failed",
        )


def verify_driver_access_token(request: Request = Security(security)) -> int:
    """Verify JWT token and return user ID for driver user."""
    token = request.headers.get("Authorization")
    token = str(token).replace("Bearer ", "")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_driver_access_token] Missing token",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="[verify_driver_access_token] Invalid token: No user ID found",
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_driver_access_token] Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_driver_access_token] Invalid token, authentication failed",
        )


async def verify_websocket_token(token: str = Query(...)) -> str:
    try:
        """Verify WebSocket token."""
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="[verify_websocket_token] Invalid token, authentication failed",
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_websocket_token] Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_websocket_token] Invalid token, authentication failed",
        )


async def verify_apidoc_token(token: str = Query(...)) -> str:
    try:
        """Verify token/client for a API document view."""
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="[verify_apidoc_token] Invalid token, authentication failed",
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_apidoc_token] Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_apidoc_token] Invalid token, authentication failed",
        )
