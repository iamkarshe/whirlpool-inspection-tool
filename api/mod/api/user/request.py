from pydantic import BaseModel, EmailStr, Field


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    mobile_number: str = Field(pattern=r"^\d{10}$")
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="operator", enum=["operator", "manager"])
    designation: str = Field(default="Operator", min_length=2, max_length=120)
