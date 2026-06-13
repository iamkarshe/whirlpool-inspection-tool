import json
from pathlib import Path

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from mod.app.response import ReleaseNoteResponse, ReleaseNotesResponse
from mod.auth.session import verify_user_session_active
from mod.model import User
from utils.jwt import decode_access_token_payload

API_ROOT = Path(__file__).resolve().parent.parent.parent
RELEASE_JSON_PATH = API_ROOT / "release.json"


def load_release_notes() -> ReleaseNotesResponse:
    if not RELEASE_JSON_PATH.is_file():
        return ReleaseNotesResponse(notes=[])

    raw_text = RELEASE_JSON_PATH.read_text(encoding="utf-8").strip()
    if not raw_text:
        return ReleaseNotesResponse(notes=[])

    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="release.json is invalid JSON",
        ) from exc

    notes_raw = payload.get("notes", []) if isinstance(payload, dict) else payload
    if not isinstance(notes_raw, list):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="release.json must contain a notes array",
        )

    notes = [ReleaseNoteResponse.model_validate(item) for item in notes_raw]
    return ReleaseNotesResponse(notes=notes)


def resolve_api_docs_bearer_token(request: Request, token_query: str | None) -> str:
    if token_query and token_query.strip():
        return token_query.strip()

    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token. Pass ?token= or Authorization: Bearer <access_token>.",
        )
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return authorization.strip()


def user_is_active_superadmin(user: User) -> bool:
    role = user.role
    if role is None or not role.is_active:
        return False
    role_name = (role.role or "").strip().lower()
    return role_name == "superadmin"


def require_superadmin_for_api_docs(
    request: Request,
    db: Session,
    token_query: str | None,
) -> User:
    raw_token = resolve_api_docs_bearer_token(request, token_query)
    payload = decode_access_token_payload(raw_token)
    verify_user_session_active(db, payload.get("jti"))

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(
            User.id == int(user_id),
            User.is_active.is_(True),
        )
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    if not user_is_active_superadmin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can access API documentation.",
        )

    request.state.user_id = user.id
    request.state.user_email = user.email
    request.state.role = user.role.role if user.role is not None else None
    request.state.session_jti = payload.get("jti")
    device_id = payload.get("device_id")
    request.state.device_id = int(device_id) if device_id is not None else None
    return user
