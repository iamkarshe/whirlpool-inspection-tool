import uuid
from datetime import date, datetime
from typing import List

from pydantic import BaseModel

from mod.api.inspection.checklist_inspection import InspectionWithChecklistPayload
from mod.api.product.response import ProductResponse
from mod.api.product_category.response import ProductCategoryResponse


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
    created_at: datetime
    updated_at: datetime
