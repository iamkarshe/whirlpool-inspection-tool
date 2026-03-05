from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.auth.actions import log_login_action, upsert_device_action
from mod.auth.request import ForgotPasswordRequest, LoginRequest
from mod.auth.response import ForgotPasswordResponse, LoginResponse
from mod.model import Role, User
from utils.db import get_db
from utils.jwt import create_access_token
from utils.password import verify_password

router = APIRouter(tags=["Auth"], prefix="/auth")


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user: User | None = db.query(User).filter(User.email == str(payload.email)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role: Role | None = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.role

    access_token = create_access_token(user_id=user.id)

    # Capture client metadata
    client_ip = request.client.host if request.client else None
    proxy_ip = request.headers.get("X-Forwarded-For")
    user_agent = request.headers.get("User-Agent")

    # Create / update device and audit log
    device = upsert_device_action(
        db=db,
        user=user,
        device_payload=payload.device,
        client_ip=client_ip,
        proxy_ip=proxy_ip,
    )
    log_login_action(
        db=db,
        user=user,
        device=device,
        access_token=access_token,
        client_ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
    )

    db.commit()

    return LoginResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        role=role_name,
        designation=user.designation,
        is_active=user.is_active,
        access_token=access_token,
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    user: User | None = db.query(User).filter(User.email == str(payload.email)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email",
        )

    return ForgotPasswordResponse(message="Password reset request accepted")
