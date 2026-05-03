import uuid

from pydantic import BaseModel, EmailStr, Field


class LoginResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    name: str
    email: EmailStr
    role: str
    designation: str
    is_active: bool
    access_token: str
    token_type: str = "bearer"
    device_uuid: uuid.UUID | None = None
    allowed_warehouses: list[str] | None = Field(
        default=None,
        description="Warehouse codes the user may access; null for superadmin.",
    )


class ForgotPasswordResponse(BaseModel):
    message: str
