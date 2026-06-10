from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ReportsDropdownOption(BaseModel):
    """Dropdown option for report filter controls."""

    value: str = Field(
        ...,
        description=(
            "Filter value sent back on analytics requests. "
            "Warehouses, plants, and users use numeric id strings. "
            'Product categories use "category_type|sub_category_type".'
        ),
        examples=["1", "AC|SPLIT"],
    )
    label: str = Field(
        ...,
        description="Human-readable label shown in the UI.",
        examples=["WH01 - Mumbai DC", "AC - SPLIT"],
    )


class DefectsParetoChartItem(BaseModel):
    section: str = Field(
        ...,
        description="Checklist section name (defect type).",
        examples=["Scratch Marks"],
    )
    defect_count: int = Field(
        ..., description="Count of checklist answers marked NO in this section."
    )
    pct_contribution: float = Field(
        ..., description="Share of total defects for this section (percent)."
    )
    cumulative_pct: float = Field(
        ..., description="Running cumulative defect share (percent)."
    )
    within_pareto_80: bool = Field(
        ...,
        description="True when this section is part of the vital few near 80% of defects.",
    )


class DefectsParetoChartResponse(BaseModel):
    """Defect pareto chart by checklist section."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    total_defects: int = Field(
        ..., description="Total checklist NO responses across all sections."
    )
    items: list[DefectsParetoChartItem] = Field(
        ..., description="Sections sorted by defect count descending."
    )


class DefectsMixItem(BaseModel):
    grading: str = Field(
        ...,
        description="Damage grading code.",
        examples=["DGR", "LDGR", "SCRAP"],
    )
    defect_count: int = Field(
        ..., description="Inspections with this damage grading in scope."
    )
    pct_contribution: float = Field(
        ..., description="Share of graded defects for this grading (percent)."
    )


class DefectsMixResponse(BaseModel):
    """Defect distribution by damage grading."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    total_defects: int = Field(
        ..., description="Inspections with any damage grading in scope."
    )
    items: list[DefectsMixItem] = Field(
        ..., description="One row per grading (DGR, LDGR, SCRAP)."
    )


class WarehouseGradingDefects(BaseModel):
    dgr: int = Field(0, description="Inspections graded DGR.")
    ldgr: int = Field(0, description="Inspections graded LDGR.")
    scrap: int = Field(0, description="Inspections graded SCRAP.")


class DefectsWarehouseItem(BaseModel):
    warehouse_id: int = Field(..., description="Warehouse id.")
    warehouse_code: str = Field(..., description="Warehouse code.")
    warehouse_name: str = Field(..., description="Warehouse name.")
    total_inspections: int = Field(
        ..., description="Inspections for this warehouse in scope."
    )
    defective_inspections: int = Field(
        ..., description="Inspections with any recorded damage."
    )
    defective_pct: float = Field(
        ...,
        description="Defective inspections divided by total inspections (percent).",
    )
    warehouse_induced_defect_pct: float = Field(
        ...,
        description=(
            "Inbound approved inspections that later failed outbound for the same "
            "serial number, divided by inbound approved count (percent)."
        ),
    )
    grading_defects: WarehouseGradingDefects = Field(
        ..., description="Defect counts split by damage grading."
    )


class DefectsWarehouseResponse(BaseModel):
    """Defect table rows for every active warehouse."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    items: list[DefectsWarehouseItem] = Field(
        ...,
        description="All active warehouses, including rows with zero inspections.",
    )


class DefectsPlantItem(BaseModel):
    plant_id: int = Field(..., description="Plant id.")
    plant_code: str = Field(..., description="Plant code.")
    plant_name: str = Field(..., description="Plant name.")
    total_inspections: int = Field(
        ..., description="Inbound inspections for this plant in scope."
    )
    defective_inspections: int = Field(
        ..., description="Inspections with any recorded damage."
    )
    defective_pct: float = Field(
        ...,
        description="Defective inspections divided by total inspections (percent).",
    )
    grading_defects: WarehouseGradingDefects = Field(
        ..., description="Defect counts split by damage grading."
    )


class DefectsPlantResponse(BaseModel):
    """Defect table rows for every active plant."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    items: list[DefectsPlantItem] = Field(
        ...,
        description="All active plants, including rows with zero inspections.",
    )


class DefectsTruckItem(BaseModel):
    truck_number: str = Field(..., description="Vehicle registration number.")
    total_inspections: int = Field(
        ..., description="Inspections for this truck in scope."
    )
    defective_inspections: int = Field(
        ..., description="Inspections with any recorded damage."
    )
    defective_pct: float = Field(
        ...,
        description="Defective inspections divided by total inspections (percent).",
    )


class DefectsTruckResponse(BaseModel):
    """Defect stats grouped by truck number."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    items: list[DefectsTruckItem] = Field(
        ..., description="One row per truck number with inspections in scope."
    )


class ExecutiveAnalyticsResponse(BaseModel):
    """Executive summary KPI cards."""

    date_from: date | None = Field(None, description="Applied range start date.")
    date_to: date | None = Field(None, description="Applied range end date.")
    inspection_volume: int = Field(
        ..., description="Total inspections matching filters and inspection type."
    )
    damaged_inspections: int = Field(
        ..., description="Inspections with any recorded damage fields."
    )
    defect_rate_pct: float = Field(
        ...,
        description="Damaged inspections divided by inspection volume (percent).",
    )
    avg_inspection_time_min: float = Field(
        ..., description="Average device_time_taken in minutes."
    )
    pending_approvals: int = Field(
        ..., description="Inspections in PENDING or IN_REVIEW status."
    )


class KpiParametersResponse(BaseModel):
    """Filter dropdown options for report screens."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "warehouses": [
                        {"value": "1", "label": "WH01 - Mumbai DC"},
                    ],
                    "plants": [{"value": "1", "label": "P01 - Plant North"}],
                    "users": [
                        {"value": "12", "label": "Jane Doe - jane@example.com"},
                    ],
                    "product_category": [
                        {"value": "AC|SPLIT", "label": "AC - SPLIT"},
                    ],
                    "gradings": [{"value": "DGR", "label": "DGR"}],
                }
            ]
        }
    )

    warehouses: list[ReportsDropdownOption] = Field(
        ..., description="Active warehouses (value is warehouse id)."
    )
    plants: list[ReportsDropdownOption] = Field(
        ..., description="Active plants (value is plant id)."
    )
    users: list[ReportsDropdownOption] = Field(
        ...,
        description="Active users (value is user id, label is name and email).",
    )
    product_category: list[ReportsDropdownOption] = Field(
        ...,
        description=(
            "Distinct category pairs (value is category_type|sub_category_type)."
        ),
    )
    gradings: list[ReportsDropdownOption] = Field(
        ..., description="Damage grading options (value equals label)."
    )
