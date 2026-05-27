from datetime import date

from pydantic import BaseModel, Field

from mod.api.inspection.response import InspectionDropdownOption


class OperationsAnalyticsResponse(BaseModel):
    date_from: date | None
    date_to: date | None
    total: int
    total_inbound: int
    total_outbound: int
    total_approved: int
    total_failed: int
    total_pending: int
    inbound_approved: int
    inbound_failed: int
    inbound_pending: int
    outbound_approved: int
    outbound_failed: int
    outbound_pending: int
    success_ratio: float
    failure_ratio: float
    passed: int
    in_review: int
    flagged: int
    logins: int
    unique_login_users: int


class OperationsTrendWarehouseItem(BaseModel):
    warehouse_code: str
    warehouse_name: str
    inspections: int
    logins: int
    success_ratio: float


class OperationsTrendBucketItem(BaseModel):
    label: str
    date_from: date
    date_to: date
    inspections: int
    logins: int
    success_ratio: float


class OperationsTrendResponse(BaseModel):
    date_from: date
    date_to: date
    by_warehouse: list[OperationsTrendWarehouseItem]
    weekly_trend: list[OperationsTrendBucketItem]


class DefectsParetoChartItem(BaseModel):
    section: str = Field(..., description="Defect type.")
    defect_count: int = Field(..., description="Checklist NO count.")
    pct_contribution: float = Field(..., description="Share of total defects.")
    cumulative_pct: float = Field(..., description="Running cumulative percent.")
    within_pareto_80: bool = Field(
        ..., description="Included in the vital few near 80% of defects."
    )


class DefectsMixItem(BaseModel):
    grading: str = Field(..., description="Damage grading.")
    defect_count: int = Field(..., description="Inspection count.")
    pct_contribution: float = Field(..., description="Share of graded defects.")


class WarehouseGradingDefects(BaseModel):
    dgr: int = Field(0, description="DGR count.")
    ldgr: int = Field(0, description="LDGR count.")
    scrap: int = Field(0, description="SCRAP count.")


class DefectsWarehouseItem(BaseModel):
    warehouse_id: int = Field(..., description="Warehouse id.")
    warehouse_code: str = Field(..., description="Warehouse code.")
    warehouse_name: str = Field(..., description="Warehouse name.")
    total_inspections: int = Field(..., description="Total inspections.")
    defective_inspections: int = Field(..., description="Defective inspections.")
    defective_pct: float = Field(..., description="Defective percent.")
    grading_defects: WarehouseGradingDefects = Field(
        ..., description="Defects by grading."
    )


class DefectsWarehouseResponse(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    items: list[DefectsWarehouseItem] = Field(
        ..., description="Defect stats per warehouse."
    )


class DefectsMixResponse(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    total_defects: int = Field(..., description="Inspections with damage grading.")
    items: list[DefectsMixItem] = Field(..., description="Defect mix by grading.")


class DefectsParetoChartResponse(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    total_defects: int = Field(..., description="Total checklist NO responses.")
    items: list[DefectsParetoChartItem] = Field(
        ..., description="Defect counts by checklist section."
    )


class ExecutiveAnalyticsResponse(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    inspection_volume: int = Field(..., description="Total inspections.")
    damaged_inspections: int = Field(..., description="Damaged inspections.")
    defect_rate_pct: float = Field(..., description="Defect rate percent.")
    avg_inspection_time_min: float = Field(..., description="Average inspection time.")
    pending_approvals: int = Field(..., description="Pending approvals.")


class KpiParametersResponse(BaseModel):
    """Filter dropdown options for reports."""

    warehouses: list[InspectionDropdownOption] = Field(
        ..., description="Active warehouses."
    )
    plants: list[InspectionDropdownOption] = Field(..., description="Active plants.")
    product_category: list[InspectionDropdownOption] = Field(
        ..., description="Product categories."
    )
    gradings: list[InspectionDropdownOption] = Field(
        ..., description="Damage gradings."
    )
