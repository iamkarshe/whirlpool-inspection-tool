import uuid
from datetime import date, datetime
from typing import List, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from mod.api.inspection.checklist_inspection import (
    ChecklistItemResponse,
    ChecklistLayerPassFail,
    InspectionInputItemResponse,
    InspectionWithChecklistPayload,
)
from mod.api.product.response import ProductResponse
from mod.api.product_category.response import ProductCategoryResponse
from mod.model import (
    DamageGrading,
    DamageLikelyCause,
    DamageSeverity,
    DamageType,
    InspectionReviewStatus,
    InspectionType,
)
from utils.common import (
    INDIA_LAT_MAX,
    INDIA_LAT_MIN,
    INDIA_LNG_MAX,
    INDIA_LNG_MIN,
    is_valid_registration,
    normalize_registration,
    parse_to_utc_datetime,
)


class BarcodeLockAcquireRequest(BaseModel):
    barcode: str = Field(..., min_length=1)
    inspection_type: InspectionType

    @field_validator("barcode", mode="after")
    @classmethod
    def strip_barcode(cls, v: str) -> str:
        return (v or "").strip()


class BarcodeLockResponse(BaseModel):
    id: int
    barcode: str
    inspection_type: str
    user_id: int
    locked_at: datetime
    expires_at: datetime


class BarcodeLockReleaseResponse(BaseModel):
    released: bool


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
    device_uuid: uuid.UUID
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


class InspectionAnalyticsKpis(BaseModel):
    """Role-aware analytics for the Data Analytics screen (same date window for all four)."""

    scans_total: int = Field(
        ...,
        description=(
            "Inspections created in the range. Operator: own scans. "
            "Manager / superadmin: all scans in warehouse scope."
        ),
    )
    scans_in_review: int = Field(
        ...,
        description=(
            "PENDING or IN_REVIEW with created_at in range. Operator: own inspections. "
            "Manager / superadmin: any in warehouse scope."
        ),
    )
    scans_approved: int = Field(
        ...,
        description=(
            "APPROVED with reviewed_at in range. Operator: their inspections. "
            "Manager: rows they reviewed. Superadmin: all approved decisions in scope."
        ),
    )
    scans_rejected: int = Field(
        ...,
        description=(
            "REJECTED with reviewed_at in range. Operator / manager same as "
            "scans_approved; superadmin: all rejections in scope."
        ),
    )


class InspectionKpisResponse(BaseModel):
    period: Literal["custom", "today", "yesterday", "week", "month"] = "custom"
    date_from: date
    date_to: date
    analytics: InspectionAnalyticsKpis
    total_inspections: int
    inbound_in_review: int
    inbound_approved: int
    inbound_rejected: int
    outbound_in_review: int
    outbound_approved: int
    outbound_rejected: int


class ManagerTeamInspectionDirectionKpis(BaseModel):
    """Inbound or outbound slice for the manager team overview."""

    in_review: int = Field(
        ...,
        description="Inspections in PENDING or IN_REVIEW for this direction.",
    )
    approved: int
    rejected: int


class ManagerTeamInspectionAllKpis(BaseModel):
    """All inspections in the reporting window (manager warehouse scope)."""

    total: int
    in_review: int = Field(
        ...,
        description="Inspections in PENDING or IN_REVIEW (any direction).",
    )
    approved: int
    rejected: int


class ManagerInspectionTeamKpisResponse(BaseModel):
    """Manager Team tab: reporting window and queue-oriented counts."""

    period: Literal["custom", "today", "yesterday", "week", "month"] = "custom"
    date_from: date
    date_to: date
    review_queue: int = Field(
        ...,
        description=(
            "Inbound in_review plus outbound in_review (each counts PENDING and "
            "IN_REVIEW). Same as all_inspections.in_review when inspections are only "
            "inbound or outbound."
        ),
    )
    all_inspections: ManagerTeamInspectionAllKpis
    inbound: ManagerTeamInspectionDirectionKpis
    outbound: ManagerTeamInspectionDirectionKpis


class OperatorInspectionDirectionKpis(BaseModel):
    """Inbound or outbound slice for the operator Data Analytics view."""

    in_review: int = Field(
        ...,
        description=(
            "Inspections where the authenticated user is ``inspector_id``, in "
            "PENDING or IN_REVIEW for this direction."
        ),
    )
    approved: int = Field(
        ...,
        description=(
            "Owner inspections with ``created_at`` in the window and review status "
            "APPROVED."
        ),
    )
    rejected: int = Field(
        ...,
        description=(
            "Owner inspections with ``created_at`` in the window and review status "
            "REJECTED."
        ),
    )


class OperatorInspectionKpisResponse(BaseModel):
    """Operator Data Analytics: status breakdown by direction for owned inspections only."""

    period: Literal["custom", "today", "yesterday", "week", "month"] = "custom"
    date_from: date
    date_to: date
    review_queue: int = Field(
        ...,
        description=(
            "Inbound in_review plus outbound in_review for inspections where the "
            "operator is ``inspector_id``."
        ),
    )
    inbound: OperatorInspectionDirectionKpis
    outbound: OperatorInspectionDirectionKpis


class InspectionDropdownOption(BaseModel):
    value: str
    label: str


class InspectionMetadataResponse(BaseModel):
    inspection_types: list[InspectionDropdownOption]
    warehouses: list[InspectionDropdownOption]
    plants: list[InspectionDropdownOption]
    damage_types: list[InspectionDropdownOption]
    damage_severities: list[InspectionDropdownOption]
    damage_causes: list[InspectionDropdownOption]
    damage_grades: list[InspectionDropdownOption]
    review_statuses: list[InspectionDropdownOption]


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


class InspectionImageUploadResponse(BaseModel):
    """Relative storage path (prefix with CDN base URL on the client)."""

    path: str


class InspectionProductForPrint(BaseModel):
    """Product unit + product fields commonly needed on printed inspection slips."""

    barcode: str = Field(
        default="",
        description="Product unit barcode (16-char scan id when registered).",
    )
    product_unit_uuid: uuid.UUID | None = None
    material_code: str = ""
    material_description: str = ""
    product_category_name: str = ""
    inspection_serial_number: str | None = Field(
        None,
        description="Serial captured on the inspection (may differ from barcode payload).",
    )


class InspectionDetailResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspector_id: int
    inspector_name: str
    device_id: int
    device_uuid: uuid.UUID
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

    product: InspectionProductForPrint
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
    image_path: list[str] = Field(default_factory=list)
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
    supplier_plant_code: str | None = None
    lat: float = Field(..., ge=INDIA_LAT_MIN, le=INDIA_LAT_MAX)
    lng: float = Field(..., ge=INDIA_LNG_MIN, le=INDIA_LNG_MAX)
    truck_number: str = Field(..., min_length=1)
    dock_number: str | None = None
    damage_type: DamageType | None = None
    damage_severity: DamageSeverity | None = None
    damage_cause: DamageLikelyCause | None = None
    damage_grade: DamageGrading | None = None
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
        if self.supplier_plant_code is not None:
            s = self.supplier_plant_code.strip()
            self.supplier_plant_code = s if s else None
        if self.dock_number is not None:
            d = self.dock_number.strip()
            self.dock_number = d if d else None
        ids = [a.id for a in self.checklist_answers]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate checklist id in checklist_answers")
        return self


class StartOutboundInspectionRequest(BaseModel):
    barcode: str = Field(..., min_length=1)
    device_uuid: uuid.UUID
    warehouse_code: str = Field(..., min_length=1)
    supplier_plant_code: str | None = None
    lat: float = Field(..., ge=INDIA_LAT_MIN, le=INDIA_LAT_MAX)
    lng: float = Field(..., ge=INDIA_LNG_MIN, le=INDIA_LNG_MAX)
    truck_number: str = Field(..., min_length=1)
    dock_number: str | None = None
    damage_type: DamageType | None = None
    damage_severity: DamageSeverity | None = None
    damage_cause: DamageLikelyCause | None = None
    damage_grade: DamageGrading | None = None
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
        if self.supplier_plant_code is not None:
            s = self.supplier_plant_code.strip()
            self.supplier_plant_code = s if s else None
        if self.dock_number is not None:
            d = self.dock_number.strip()
            self.dock_number = d if d else None
        ids = [a.id for a in self.checklist_answers]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate checklist id in checklist_answers")
        return self
