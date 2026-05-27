from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from mod.model import DamageGrading, InspectionType

ANALYTICS_REQUEST_EXAMPLE = {
    "date_from": "2026-05-01",
    "date_to": "2026-05-07",
    "type": "inbound",
    "warehouse": [1, 2],
    "plant": [1, 2],
    "product_category": ["AC|SPLIT", "AC|WINDOW"],
    "grading": "DGR",
}


class OperationsAnalyticsRequest(BaseModel):
    """Shared filter body for report analytics POST endpoints."""

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={"examples": [ANALYTICS_REQUEST_EXAMPLE]},
    )

    date_from: date | None = Field(
        None,
        description="Inclusive UTC start date for the reporting window.",
        examples=["2026-05-01"],
    )
    date_to: date | None = Field(
        None,
        description="Inclusive UTC end date for the reporting window.",
        examples=["2026-05-07"],
    )
    inspection_type: InspectionType | None = Field(
        None,
        alias="type",
        description="Master inspection direction filter. Use inbound or outbound.",
        examples=["inbound"],
    )
    warehouse: list[int] = Field(
        default_factory=list,
        description=(
            "Warehouse ids from GET /api/reports/kpi-parameters. "
            "Empty array means all warehouses."
        ),
        examples=[[1, 2]],
    )
    plant: list[int] = Field(
        default_factory=list,
        description=(
            "Plant ids from GET /api/reports/kpi-parameters. "
            "Inbound only. Empty array means all plants."
        ),
        examples=[[1, 2]],
    )
    product_category: list[str] = Field(
        default_factory=list,
        description=(
            'Product category pair keys as "category_type|sub_category_type" '
            "(same as KPI parameters value). Empty array means all categories."
        ),
        examples=[["AC|SPLIT", "AC|WINDOW"]],
    )
    grading: DamageGrading | None = Field(
        None,
        description="Optional damage grading filter (DGR, LDGR, SCRAP).",
        examples=["DGR"],
    )
