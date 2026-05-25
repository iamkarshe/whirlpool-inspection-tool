import datetime

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from mod.model import Device, PushSubscription, UserSession
from utils.jwt import decode_access_token_payload


def create_user_session(
    db: Session,
    *,
    user_id: int,
    jti: str,
    device_id: int | None,
    expires_at: datetime.datetime,
) -> UserSession:
    session = UserSession(
        jti=jti,
        user_id=user_id,
        device_id=device_id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(session)
    db.flush()
    return session


def verify_user_session_active(db: Session, jti: str | None) -> None:
    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token, please login again",
        )

    session = (
        db.query(UserSession)
        .filter(
            UserSession.jti == jti,
            UserSession.is_active.is_(True),
            UserSession.expires_at > datetime.datetime.now(datetime.timezone.utc),
        )
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked, please login again",
        )


def verify_request_access_token(db: Session, request) -> int:
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Missing token",
        )
    token = token[7:] if token.lower().startswith("bearer ") else token
    payload = decode_access_token_payload(token)
    verify_user_session_active(db, payload.get("jti"))
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[verify_access_token] Invalid token: No user ID found",
        )
    request.state.session_jti = payload.get("jti")
    device_id = payload.get("device_id")
    request.state.device_id = int(device_id) if device_id is not None else None
    return int(user_id)


def revoke_sessions_for_device(db: Session, device_id: int) -> int:
    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.device_id == device_id,
            UserSession.is_active.is_(True),
        )
        .all()
    )
    for session in sessions:
        session.is_active = False
    db.flush()
    return len(sessions)


def revoke_sessions_for_devices(db: Session, device_ids: list[int]) -> int:
    if not device_ids:
        return 0
    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.device_id.in_(device_ids),
            UserSession.is_active.is_(True),
        )
        .all()
    )
    for session in sessions:
        session.is_active = False
    db.flush()
    return len(sessions)


def deactivate_push_subscriptions_for_device(db: Session, device_id: int) -> int:
    result = db.execute(
        update(PushSubscription)
        .where(
            PushSubscription.device_id == device_id,
            PushSubscription.is_active.is_(True),
        )
        .values(is_active=False)
    )
    db.flush()
    return int(result.rowcount or 0)


def deactivate_push_subscriptions_for_user_except_device(
    db: Session,
    user_id: int,
    *,
    except_device_id: int | None,
) -> int:
    conditions = [
        PushSubscription.user_id == user_id,
        PushSubscription.is_active.is_(True),
    ]
    if except_device_id is not None:
        conditions.append(PushSubscription.device_id != except_device_id)

    result = db.execute(
        update(PushSubscription).where(*conditions).values(is_active=False)
    )
    db.flush()
    return int(result.rowcount or 0)


def deregister_device(
    db: Session,
    device: Device,
) -> None:
    device.is_active = False
    revoke_sessions_for_device(db, device.id)
    deactivate_push_subscriptions_for_device(db, device.id)
    db.flush()
