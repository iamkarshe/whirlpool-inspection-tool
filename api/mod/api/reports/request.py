from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from mod.model import DamageGrading, InspectionType


class OperationsAnalyticsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date_from: date | None = None
    date_to: date | None = None
    inspection_type: InspectionType | None = Field(None, alias="type")
    warehouse: list[int] = Field(default_factory=list)
    plant: list[int] = Field(default_factory=list)
    product_category: list[int] = Field(default_factory=list)
    grading: DamageGrading | None = None
