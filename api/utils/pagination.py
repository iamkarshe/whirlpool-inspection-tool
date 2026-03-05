from datetime import date
from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field
from sqlalchemy import or_

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
    page: int = Field(1, ge=1)
    per_page: int = Field(20, ge=1, le=100)
    search: Optional[str] = None
    sort_by: Optional[str] = "id"
    sort_dir: str = "asc"
    date_field: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None


def get_pagination_params(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("id"),
    sort_dir: str = Query("asc"),
    date_field: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
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
) -> Query:
    # Search
    if params.search and search_columns:
        term = f"%{params.search.strip()}%"
        query = query.filter(or_(*[col.ilike(term) for col in search_columns]))

    # Date range
    if date_fields and params.date_field in date_fields:
        field = date_fields[params.date_field]
        if params.date_from:
            query = query.filter(field >= params.date_from)
        if params.date_to:
            query = query.filter(field <= params.date_to)

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
