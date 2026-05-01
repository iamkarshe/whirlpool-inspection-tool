import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    mobile_number: str = Field(pattern=r"^\d{10}$")
    password: str = Field(min_length=6, max_length=128)
    role: Literal["operator", "manager"] = "operator"
    designation: str = Field(default="Operator", min_length=2, max_length=120)
    allowed_warehouse: list[str] = Field(
        default_factory=list,
        description="Warehouse codes this user may access",
    )
    allowed_plants: list[str] = Field(
        default_factory=list,
        description="Plant codes this user may access",
    )


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    mobile_number: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: Literal["operator", "manager"] | None = None
    designation: str | None = Field(default=None, min_length=2, max_length=120)
    is_active: bool | None = None
    allowed_warehouse: list[str] | None = Field(
        default=None,
        description="Replace warehouse codes; omit to leave unchanged",
    )
    allowed_plants: list[str] | None = Field(
        default=None,
        description="Replace plant codes; omit to leave unchanged",
    )

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not re.fullmatch(r"\d{10}", v):
            raise ValueError("mobile_number must be exactly 10 digits")
        return v
