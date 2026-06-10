"""Query models for inspection list endpoints (GET query string, not POST JSON)."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from fastapi import Depends, Query
from pydantic import BaseModel, Field

from utils.pagination import PaginationParams, get_pagination_params


class InspectionListQueryParams(BaseModel):
    """All query parameters for ``GET /api/inspections``.

    Orval exposes these as URL query parameters. Omit a filter to mean "All"
    in the admin UI (Type / Warehouse / Category / User = All).
    """

    page: int = Field(1, ge=1, description="Page number (1-based).")
    per_page: int = Field(20, ge=1, le=100, description="Rows per page (max 100).")
    search: str | None = Field(
        default=None,
        description=(
            "Search inspector name, material code/description, device fingerprint, or IMEI."
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
    warehouse_uuids: list[uuid.UUID] = Field(
        default_factory=list,
        description=(
            "Warehouse UUIDs (multi-select). "
            "Repeat query param per UUID. Empty or omitted means All warehouses."
        ),
    )
    plant_uuid: uuid.UUID | None = Field(
        default=None,
        description="Filter by plant UUID. Omit for All plants.",
    )
    product_category_uuids: list[uuid.UUID] = Field(
        default_factory=list,
        description=(
            "Product category UUIDs (multi-select). "
            "Repeat query param per UUID. Empty or omitted means All categories."
        ),
    )
    inspector_uuids: list[uuid.UUID] = Field(
        default_factory=list,
        description=(
            "Inspector user UUIDs (multi-select). "
            "Repeat query param per UUID. Empty or omitted means All users. "
            "Operators always see only their own inspections."
        ),
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


def get_inspection_list_query_params(
    pagination: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True, description="When false, include soft-deleted inspections."),
    inspection_type: Literal["inbound", "outbound"] | None = Query(
        None,
        description="inbound or outbound. Omit for All.",
    ),
    warehouse_uuids: list[uuid.UUID] | None = Query(
        None,
        description=(
            "Warehouse UUIDs (multi-select). Repeat param per value. Omit for All."
        ),
    ),
    plant_uuid: uuid.UUID | None = Query(
        None,
        description="Plant UUID. Omit for All.",
    ),
    product_category_uuids: list[uuid.UUID] | None = Query(
        None,
        description=(
            "Product category UUIDs (multi-select). Repeat param per value. Omit for All."
        ),
    ),
    inspector_uuids: list[uuid.UUID] | None = Query(
        None,
        description=(
            "Inspector user UUIDs (multi-select). Repeat param per value. Omit for All."
        ),
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
        is_active=is_active,
        inspection_type=inspection_type,
        warehouse_uuids=list(warehouse_uuids or []),
        plant_uuid=plant_uuid,
        product_category_uuids=list(product_category_uuids or []),
        inspector_uuids=list(inspector_uuids or []),
    )
