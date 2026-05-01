import uuid
from datetime import date, datetime
from typing import List

from pydantic import AnyUrl, BaseModel, Field, field_validator, model_validator

from mod.api.inspection.checklist_inspection import (
    ChecklistItemResponse,
    ChecklistLayerPassFail,
    InspectionInputItemResponse,
    InspectionWithChecklistPayload,
)
from mod.api.product.response import ProductResponse
from mod.api.product_category.response import ProductCategoryResponse
from mod.model import InspectionReviewStatus
from utils.common import (
    INDIA_LAT_MAX,
    INDIA_LAT_MIN,
    INDIA_LNG_MAX,
    INDIA_LNG_MIN,
    is_valid_registration,
    normalize_registration,
    parse_to_utc_datetime,
)


class BarcodeParseSegments(BaseModel):
    material_code: str
    compressor_code: str
    manufacturing_year: str
    week_of_year: str
    serial_number: str


class BarcodeParseUnitResponse(BaseModel):
    uuid: uuid.UUID
    barcode: str
    product_id: int


class BarcodeParseResponse(BaseModel):
    segments: BarcodeParseSegments
    product_unit: BarcodeParseUnitResponse | None = None
    product: ProductResponse
    product_category: ProductCategoryResponse
    inbound_inspection: InspectionWithChecklistPayload | None = None
    outbound_inspection: InspectionWithChecklistPayload | None = None


class InspectionPassFailCounts(BaseModel):
    pass_count: int
    fail_count: int


class InspectionListItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    device_fingerprint: str
    product_id: int
    product_material_code: str
    inspection_type: str
    review_status: str
    reviewer_id: int | None
    reviewer_name: str | None
    reviewed_at: datetime | None
    warehouse_code: str | None
    plant_code: str | None
    outer: InspectionPassFailCounts
    inner: InspectionPassFailCounts
    product_checklist: InspectionPassFailCounts
    created_at: datetime
    updated_at: datetime


class InspectionListResponse(BaseModel):
    data: List[InspectionListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class InspectionKpisResponse(BaseModel):
    date_from: date
    date_to: date
    total_inspections: int
    inbound_passed: int
    inbound_failed: int
    outbound_passed: int
    outbound_failed: int


class InspectionReviewHistoryItem(BaseModel):
    from_status: str | None
    to_status: str
    actor_user_id: int
    actor_name: str
    comment: str | None
    created_at: datetime


class InspectionReviewStatusUpdateRequest(BaseModel):
    review_status: InspectionReviewStatus
    comment: str | None = Field(None, max_length=4000)

    @field_validator("comment", mode="after")
    @classmethod
    def strip_comment(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


class InspectionDetailResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    device_fingerprint: str
    product_id: int
    product_material_code: str
    inspection_type: str
    warehouse_code: str | None
    plant_code: str | None
    lat: float | None
    lng: float | None
    ip_address: str | None
    review_status: str
    is_under_review: bool
    reviewer_id: int | None
    reviewer_name: str | None
    reviewed_at: datetime | None
    reviewed_comment: str | None
    review_history: list[InspectionReviewHistoryItem]
    created_at: datetime
    updated_at: datetime


class InspectionFullResponse(InspectionDetailResponse):
    """Detail row plus checklist inputs, images, and pass/fail counts (parse-barcode parity)."""

    product_unit_id: int
    inputs: list[InspectionInputItemResponse]
    outer_packaging_images: list[str]
    inner_packaging_images: list[str]
    product_images: list[str]
    outer_packaging_checks: ChecklistLayerPassFail
    inner_packaging_checks: ChecklistLayerPassFail
    product_checks: ChecklistLayerPassFail
    checklist_pass_total: int
    checklist_fail_total: int


class ChecklistGroupBlock(BaseModel):
    group_name: str
    items: list[ChecklistItemResponse]


class ActiveChecklistGroupedResponse(BaseModel):
    groups: list[ChecklistGroupBlock]


class ChecklistAnswerEntry(BaseModel):
    id: int = Field(..., ge=1)
    value: str
    image_path: list[AnyUrl] = Field(default_factory=list)
    remarks: str | None = None

    @field_validator("image_path", mode="before")
    @classmethod
    def coerce_image_path_list(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("image_path must be an array of URL strings")
        out: list[str] = []
        for i, item in enumerate(v):
            if item is None:
                raise ValueError(f"image_path[{i}] must not be null")
            s = str(item).strip()
            if not s:
                raise ValueError(f"image_path[{i}] must be a non-empty URL string")
            out.append(s)
        return out

    @model_validator(mode="after")
    def normalize_entry(self):
        self.value = (self.value or "").strip()
        if self.remarks is not None:
            r = self.remarks.strip()
            self.remarks = r if r else None
        return self


class StartInboundInspectionRequest(BaseModel):
    barcode: str = Field(..., min_length=1)
    device_uuid: uuid.UUID
    warehouse_code: str = Field(..., min_length=1)
    supplier_plant_code: str = Field(..., min_length=1)
    lat: float = Field(..., ge=INDIA_LAT_MIN, le=INDIA_LAT_MAX)
    lng: float = Field(..., ge=INDIA_LNG_MIN, le=INDIA_LNG_MAX)
    truck_number: str = Field(..., min_length=1)
    dock_number: str | None = None
    truck_docking_time: datetime
    checklist_answers: list[ChecklistAnswerEntry] = Field(default_factory=list)

    @field_validator("truck_number", mode="after")
    @classmethod
    def validate_truck_number(cls, v: str) -> str:
        t = (v or "").strip()
        if not is_valid_registration(t):
            raise ValueError(
                "truck_number must be a valid Indian vehicle registration "
                "(state format, e.g. CG01AC23334, or Bharat series, e.g. 21BH1234AA)"
            )
        return normalize_registration(t)

    @field_validator("truck_docking_time", mode="before")
    @classmethod
    def coerce_truck_docking_time(cls, v):
        return parse_to_utc_datetime(v)

    @model_validator(mode="after")
    def normalize_and_validate_answers(self):
        self.barcode = self.barcode.strip()
        self.warehouse_code = self.warehouse_code.strip()
        self.supplier_plant_code = self.supplier_plant_code.strip()
        if self.dock_number is not None:
            d = self.dock_number.strip()
            self.dock_number = d if d else None
        ids = [a.id for a in self.checklist_answers]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate checklist id in checklist_answers")
        return self
