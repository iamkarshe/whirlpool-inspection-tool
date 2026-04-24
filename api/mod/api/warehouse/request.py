from pydantic import BaseModel, Field


class WarehouseCreateRequest(BaseModel):
    warehouse_code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    lat: float | None = None
    lng: float | None = None
    address: str = Field(default="", max_length=128)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=10)


class WarehouseUpdateRequest(BaseModel):
    warehouse_code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    lat: float | None = None
    lng: float | None = None
    address: str = Field(default="", max_length=128)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=10)
    is_active: bool = True
