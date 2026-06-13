from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReleaseFeatureType = Literal["feature", "fix", "improvement", "chore"]

RELEASE_FEATURE_EXAMPLE = {
    "text": "Add release notes API backed by release.json",
    "type": "feature",
    "hash": "2148dbd",
}

RELEASE_NOTE_EXAMPLE = {
    "id": "2026-06-14",
    "version": "2026-06-14",
    "released_at": "2026-06-14",
    "title": "Deploy 2026-06-14",
    "features": [RELEASE_FEATURE_EXAMPLE],
}

RELEASE_NOTES_RESPONSE_EXAMPLE = {
    "notes": [RELEASE_NOTE_EXAMPLE],
}


class VersionResponse(BaseModel):
    message: str = Field(description="Application display name.")
    version: str = Field(description="API semantic version.")
    can_access_app: bool = Field(
        description=(
            "Whether this client may use the application. "
            "False when VPN IP allowlisting is configured and the request IP is not allowed."
        ),
    )
    can_login_multiple_devices: bool = Field(
        description=(
            "Whether the API allows multiple active device sessions per user. "
            "When false, login may require device selection via requires_device_selection."
        ),
    )
    public_ip_address: str | None = Field(
        default=None,
        description=("Client IP Address observed by the API."),
    )
    vpn_server: str | None = Field(
        default=None,
        description=("Corporate VPN endpoint hostname."),
    )


class ReleaseFeatureResponse(BaseModel):
    """One change bullet inside a release note."""

    text: str = Field(description="Human-readable change description for the UI list.")
    type: ReleaseFeatureType | None = Field(
        default=None,
        description=(
            "Optional badge type for React pills: feature, fix, improvement, or chore. "
            "Omit or null when the source commit had no [feature]/[fix]/… tag."
        ),
    )
    hash: str | None = Field(
        default=None,
        description="Short git commit hash (deploy-generated entries). Optional.",
    )


class ReleaseNoteResponse(BaseModel):
    """Release note group for one deploy/version."""

    model_config = ConfigDict(json_schema_extra={"examples": [RELEASE_NOTE_EXAMPLE]})

    id: str = Field(
        description="Stable id for detail routes and React row keys (e.g. date or version slug).",
    )
    version: str = Field(
        description="Version label shown in the table badge column.",
    )
    released_at: str = Field(
        description="Release date in YYYY-MM-DD format. Map to releasedAt in React.",
    )
    title: str = Field(description="Release title shown in the list and detail dialog.")
    features: list[ReleaseFeatureResponse] = Field(
        default_factory=list,
        description="Ordered change bullets for the detail dialog.",
    )


class ReleaseNotesResponse(BaseModel):
    """GET /api/release-notes response."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [RELEASE_NOTES_RESPONSE_EXAMPLE]},
    )

    notes: list[ReleaseNoteResponse] = Field(
        default_factory=list,
        description=(
            "Release notes newest first. Render as a sortable table; "
            "open detail dialog by id with features[] bullets and optional type badges."
        ),
    )
