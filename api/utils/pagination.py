from typing import Any, Callable, Dict, List, TypeVar

from sqlalchemy.orm import Query


T = TypeVar("T")
R = TypeVar("R")


def paginate_query(query: Query, page: int = 1, per_page: int = 20) -> Query:
    """
    Apply simple offset/limit pagination to a SQLAlchemy query.
    """
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
    """
    Generic helper to build a paginated response payload.

    - query: SQLAlchemy Query for the base dataset (without offset/limit).
    - page / per_page: pagination parameters.
    - mapper: function mapping a model instance to a response DTO.
    """
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


