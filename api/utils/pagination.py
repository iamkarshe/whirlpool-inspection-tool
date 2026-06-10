from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field
from sqlalchemy import or_

from utils.common import default_utc_calendar_dates_last_7_days, utc_end_exclusive_day_range

T = TypeVar("T")
R = TypeVar("R")


def paginate_query(query: Query, page: int = 1, per_page: int = 20) -> Query:
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1

    offset = (page - 1) * per_page
    return query.offset(offset).limit(per_page)


def build_paginated_response(
    query: Query,
    page: int,
    per_page: int,
    mapper: Callable[[T], R],
) -> Dict[str, Any]:
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1

    total: int = query.count()

    paginated_query = paginate_query(query, page=page, per_page=per_page)
    items: List[T] = paginated_query.all()

    data: List[R] = [mapper(item) for item in items]

    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    return {
        "data": data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


class PaginationParams(BaseModel):
    """Shared query-string pagination and table filters (GET requests, not JSON body)."""

    page: int = Field(1, ge=1, description="Page number (1-based).")
    per_page: int = Field(
        20,
        ge=1,
        le=100,
        description="Rows per page (max 100).",
    )
    search: Optional[str] = Field(
        default=None,
        description="Case-insensitive substring search across route-specific text columns.",
    )
    sort_by: Optional[str] = Field(
        default="id",
        description="Sort column key; allowed values depend on the list endpoint.",
    )
    sort_dir: str = Field(
        default="asc",
        description="Sort direction: asc or desc.",
    )
    date_field: Optional[str] = Field(
        default=None,
        description=(
            "Date column to filter on (e.g. created_at). "
            "Required with date_from/date_to unless the route applies a default range."
        ),
    )
    date_from: Optional[date] = Field(
        default=None,
        description="Inclusive UTC start date; must be set together with date_to.",
    )
    date_to: Optional[date] = Field(
        default=None,
        description="Inclusive UTC end date; must be set together with date_from.",
    )


class PaginatedListResponseBase(BaseModel):
    """Standard list envelope returned by paginated GET endpoints."""

    total: int = Field(description="Total rows matching filters across all pages.")
    page: int = Field(description="Current page number (1-based).")
    per_page: int = Field(description="Page size used for this response.")
    total_pages: int = Field(description="Total pages available for the current filters.")


def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number (1-based)."),
    per_page: int = Query(20, ge=1, le=100, description="Rows per page (max 100)."),
    search: Optional[str] = Query(
        None,
        description="Case-insensitive substring search across route-specific columns.",
    ),
    sort_by: Optional[str] = Query(
        "id",
        description="Sort column key; allowed values depend on the list endpoint.",
    ),
    sort_dir: str = Query("asc", description="Sort direction: asc or desc."),
    date_field: Optional[str] = Query(
        None,
        description="Date column key (e.g. created_at). See endpoint docs for allowed keys.",
    ),
    date_from: Optional[date] = Query(
        None,
        description="Inclusive UTC start date; set together with date_to.",
    ),
    date_to: Optional[date] = Query(
        None,
        description="Inclusive UTC end date; set together with date_from.",
    ),
) -> PaginationParams:
    return PaginationParams(
        page=page,
        per_page=per_page,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        date_field=date_field,
        date_from=date_from,
        date_to=date_to,
    )


def apply_standard_filters(
    query: Query,
    params: PaginationParams,
    search_columns: Optional[Iterable[Any]] = None,
    date_fields: Optional[Dict[str, Any]] = None,
    sort_fields: Optional[Dict[str, Any]] = None,
    default_sort_field: str = "id",
    *,
    date_default_range: bool = True,
) -> Query:
    # Search
    if params.search and search_columns:
        term = f"%{params.search.strip()}%"
        query = query.filter(or_(*[col.ilike(term) for col in search_columns]))

    # Date range
    if date_fields and params.date_field in date_fields:
        field = date_fields[params.date_field]
        if (
            date_default_range
            and params.date_from is None
            and params.date_to is None
        ):
            d0, d1 = default_utc_calendar_dates_last_7_days()
            start, end_exclusive = utc_end_exclusive_day_range(d0, d1)
            query = query.filter(field >= start, field < end_exclusive)
        elif params.date_from is not None and params.date_to is not None:
            start, end_exclusive = utc_end_exclusive_day_range(
                params.date_from, params.date_to
            )
            query = query.filter(field >= start, field < end_exclusive)
        elif params.date_from is not None:
            start = datetime.combine(
                params.date_from, time.min, tzinfo=timezone.utc
            )
            query = query.filter(field >= start)
        elif params.date_to is not None:
            end_exclusive = datetime.combine(
                params.date_to + timedelta(days=1),
                time.min,
                tzinfo=timezone.utc,
            )
            query = query.filter(field < end_exclusive)

    # Sorting
    if sort_fields:
        sort_key = params.sort_by or default_sort_field
        sort_column = sort_fields.get(sort_key, sort_fields.get(default_sort_field))
        if sort_column is not None:
            if params.sort_dir.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

    return query
