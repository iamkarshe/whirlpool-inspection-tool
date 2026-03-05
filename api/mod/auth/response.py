import uuid

from pydantic import BaseModel, EmailStr


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


class ForgotPasswordResponse(BaseModel):
    message: str
