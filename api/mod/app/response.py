from pydantic import BaseModel, Field


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
