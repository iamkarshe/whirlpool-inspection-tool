"""Query models for inspection list endpoints (GET query string, not POST JSON)."""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import Depends, Query
from pydantic import BaseModel, Field

from utils.pagination import PaginationParams, get_pagination_params


class InspectionScopeQueryParams(BaseModel):
    """Shared scope filters aligned with ``GET /api/reports/kpi-parameters`` values."""

    warehouse_ids: list[int] = Field(
        default_factory=list,
        description=(
            "Warehouse numeric ids (multi-select). "
            "Repeat query param per id. Empty or omitted means all (role scope)."
        ),
    )
    plant_ids: list[int] = Field(
        default_factory=list,
        description=(
            "Plant numeric ids (multi-select, inbound only). "
            "Repeat query param per id. Empty or omitted means all."
        ),
    )
    product_category: list[str] = Field(
        default_factory=list,
        description=(
            "Product category pair keys (multi-select), e.g. AC|SPLIT. "
            "Repeat query param per value. Empty or omitted means all."
        ),
    )
    user_ids: list[int] = Field(
        default_factory=list,
        description=(
            "Inspector user ids (multi-select) from kpi-parameters users[].value. "
            "Repeat query param per id. Empty or omitted means all users. "
            "Operators always see only their own inspections."
        ),
    )


class InspectionListQueryParams(InspectionScopeQueryParams):
    """All query parameters for ``GET /api/inspections``."""

    page: int = Field(1, ge=1, description="Page number (1-based).")
    per_page: int = Field(20, ge=1, le=100, description="Rows per page (max 100).")
    search: str | None = Field(
        default=None,
        description=(
            "Search product unit barcode, inspector name, material code/description, "
            "device fingerprint, or IMEI."
        ),
    )
    sort_by: str | None = Field(
        default="created_at",
        description="Sort key: id, created_at, or updated_at.",
    )
    sort_dir: str = Field(default="asc", description="asc or desc.")
    date_field: str | None = Field(
        default=None,
        description="created_at or updated_at. Defaults to created_at when dates are set.",
    )
    date_from: date | None = Field(
        default=None,
        description="Inclusive UTC start date. Set together with date_to.",
    )
    date_to: date | None = Field(
        default=None,
        description="Inclusive UTC end date. Set together with date_from.",
    )
    is_active: bool = Field(
        default=True,
        description="When false, include soft-deleted inspections.",
    )
    inspection_type: Literal["inbound", "outbound"] | None = Field(
        default=None,
        description="Filter by direction. Omit for All (inbound + outbound).",
    )
    def pagination_params(self) -> PaginationParams:
        return PaginationParams(
            page=self.page,
            per_page=self.per_page,
            search=self.search,
            sort_by=self.sort_by,
            sort_dir=self.sort_dir,
            date_field=self.date_field,
            date_from=self.date_from,
            date_to=self.date_to,
        )


def get_inspection_scope_query_params(
    warehouse_ids: list[int] | None = Query(
        None,
        description="Warehouse ids from kpi-parameters. Repeat param per value.",
    ),
    plant_ids: list[int] | None = Query(
        None,
        description="Plant ids from kpi-parameters (inbound only). Repeat param per value.",
    ),
    product_category: list[str] | None = Query(
        None,
        description="Category pair keys from kpi-parameters, e.g. AC|SPLIT.",
    ),
    user_ids: list[int] | None = Query(
        None,
        description="Inspector user ids from kpi-parameters users[].value.",
    ),
) -> InspectionScopeQueryParams:
    return InspectionScopeQueryParams(
        warehouse_ids=list(warehouse_ids or []),
        plant_ids=list(plant_ids or []),
        product_category=list(product_category or []),
        user_ids=list(user_ids or []),
    )


def get_inspection_list_query_params(
    pagination: PaginationParams = Depends(get_pagination_params),
    scope: InspectionScopeQueryParams = Depends(get_inspection_scope_query_params),
    is_active: bool = Query(True, description="When false, include soft-deleted inspections."),
    inspection_type: Literal["inbound", "outbound"] | None = Query(
        None,
        description="inbound or outbound. Omit for All.",
    ),
) -> InspectionListQueryParams:
    return InspectionListQueryParams(
        page=pagination.page,
        per_page=pagination.per_page,
        search=pagination.search,
        sort_by=pagination.sort_by,
        sort_dir=pagination.sort_dir,
        date_field=pagination.date_field,
        date_from=pagination.date_from,
        date_to=pagination.date_to,
        warehouse_ids=scope.warehouse_ids,
        plant_ids=scope.plant_ids,
        product_category=scope.product_category,
        user_ids=scope.user_ids,
        is_active=is_active,
        inspection_type=inspection_type,
    )
