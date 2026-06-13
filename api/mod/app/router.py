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
    description="Returns release notes from release.json for authenticated users.",
    response_model=ReleaseNotesResponse,
    responses={401: {"description": "Missing or invalid access token."}},
)
@exception_handler_decorator
def get_release_notes() -> ReleaseNotesResponse:
    return load_release_notes()
