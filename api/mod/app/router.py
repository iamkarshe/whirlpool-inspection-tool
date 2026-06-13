from fastapi import APIRouter, Depends

from mod.api.middleware import auth_dependency
from mod.app.helper import load_release_notes
from mod.app.response import ReleaseNotesResponse
from utils.decorator import exception_handler_decorator

router = APIRouter(
    tags=["App"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/release-notes",
    name="get_release_notes",
    summary="List application release notes",
    description=(
        "Returns deploy release notes from `release.json` for authenticated dashboard users.\n\n"
        "**React usage**\n"
        "- Call with `Authorization: Bearer <access_token>`.\n"
        "- Response field names are snake_case (`released_at`); map to camelCase in the UI (`releasedAt`).\n"
        "- Render `notes[]` as the release table: `version`, `released_at`, `title`, feature count.\n"
        "- Detail dialog: `title`, `version`, `released_at`, and `features[]` with `text`, optional `type` badge, optional `hash`.\n"
        "- `features[].type` is one of: `feature`, `fix`, `improvement`, `chore` (or omitted).\n"
        "- Notes are ordered newest first.\n\n"
        "**Auth errors**\n"
        "- `401` missing/invalid token\n"
        "- `403` password change required (same as other `/api/*` routes)"
    ),
    response_model=ReleaseNotesResponse,
    responses={
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Password change required before using the application."},
    },
)
@exception_handler_decorator
def get_release_notes() -> ReleaseNotesResponse:
    return load_release_notes()
