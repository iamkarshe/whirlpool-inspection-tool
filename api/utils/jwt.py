import datetime

import jwt
from fastapi import HTTPException, Query, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from utils.env import get_env
from utils.log import debug_rich_console

SECRET_KEY = str(get_env("JWT_SECRET"))
ALGORITHM = "HS256"

security = HTTPBearer()


def create_access_token(user_id: int) -> str:
    """Generate JWT token for a user with 24 hours validity."""
    jwt_expiry_hours = 24

    payload = {
        "sub": str(user_id),
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=jwt_expiry_hours),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(request: Request = Security(security)) -> int:
    """Verify JWT token and return user ID."""
    token = request.headers.get("Authorization")
    token = str(token).replace("Bearer ", "")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Missing token",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="[verify_access_token] Invalid token: No user ID found",
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Token expired, please login again",
        )
    except jwt.InvalidTokenError:
        debug_rich_console()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Invalid token, authentication failed",
        )


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
