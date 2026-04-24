from pydantic import BaseModel, Field


class PlantCreateRequest(BaseModel):
    plant_code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    lat: float
    lng: float
    address: str = Field(min_length=2, max_length=128)
    city: str = Field(min_length=2, max_length=120)
    postal_code: int = Field(ge=0)


class PlantUpdateRequest(BaseModel):
    plant_code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    lat: float | None = None
    lng: float | None = None
    address: str = Field(default="", max_length=128)
    city: str = Field(min_length=2, max_length=120)
    postal_code: int = Field(ge=0)
    is_active: bool = True
