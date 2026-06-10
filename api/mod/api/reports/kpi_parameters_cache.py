"""In-process TTL cache for KPI parameter dropdown options."""

from __future__ import annotations

import functools
import threading
import time
from dataclasses import dataclass
from typing import Callable, TypeVar

from sqlalchemy.orm import Session

from mod.api.reports.response import ReportsDropdownOption
from mod.model import DamageGrading, Plant, ProductCategory, User, Warehouse
from utils.env import get_kpi_parameters_cache_ttl_seconds

PRODUCT_CATEGORY_PAIR_SEP = "|"

T = TypeVar("T")


@dataclass(frozen=True)
class WarehouseRow:
    id: int
    warehouse_code: str
    name: str


@dataclass(frozen=True)
class KpiParametersSnapshot:
    cached_at: float
    users: tuple[ReportsDropdownOption, ...]
    plants: tuple[ReportsDropdownOption, ...]
    product_category: tuple[ReportsDropdownOption, ...]
    product_category_pairs: tuple[tuple[str, str], ...]
    gradings: tuple[ReportsDropdownOption, ...]
    warehouse_rows: tuple[WarehouseRow, ...]


_snapshot: KpiParametersSnapshot | None = None
_lock = threading.Lock()


def product_category_pair_value(category_type: str, sub_category_type: str) -> str:
    return f"{category_type}{PRODUCT_CATEGORY_PAIR_SEP}{sub_category_type}"


def product_category_pair_label(category_type: str, sub_category_type: str) -> str:
    return f"{category_type} - {sub_category_type}"


def invalidate_kpi_parameters_cache() -> None:
    global _snapshot
    with _lock:
        _snapshot = None


def clear_product_category_pairs_cache() -> None:
    invalidate_kpi_parameters_cache()


def hourly_ttl_cache(
    loader: Callable[[Session], T],
) -> Callable[[Session], T]:
    """Cache loader output until TTL expires or cache is invalidated."""

    @functools.wraps(loader)
    def wrapper(db: Session) -> T:
        global _snapshot
        ttl_seconds = get_kpi_parameters_cache_ttl_seconds()
        now = time.monotonic()
        with _lock:
            snapshot = _snapshot
            if snapshot is not None and (now - snapshot.cached_at) < ttl_seconds:
                return snapshot  # type: ignore[return-value]

        loaded = loader(db)
        with _lock:
            _snapshot = loaded  # type: ignore[assignment]
            return loaded

    return wrapper


@hourly_ttl_cache
def get_kpi_parameters_snapshot(db: Session) -> KpiParametersSnapshot:
    user_rows = (
        db.query(User.id, User.name, User.email)
        .filter(User.is_active.is_(True))
        .order_by(User.name.asc(), User.email.asc())
        .all()
    )
    plant_rows = (
        db.query(Plant.id, Plant.plant_code, Plant.name)
        .filter(Plant.is_active.is_(True))
        .order_by(Plant.plant_code.asc())
        .all()
    )
    category_rows = (
        db.query(ProductCategory.category_type, ProductCategory.sub_category_type)
        .filter(ProductCategory.is_active.is_(True))
        .distinct()
        .order_by(
            ProductCategory.category_type.asc(),
            ProductCategory.sub_category_type.asc(),
        )
        .all()
    )
    warehouse_rows = (
        db.query(Warehouse.id, Warehouse.warehouse_code, Warehouse.name)
        .filter(Warehouse.is_active.is_(True))
        .order_by(Warehouse.warehouse_code.asc())
        .all()
    )
    category_pairs = [
        (row.category_type, row.sub_category_type) for row in category_rows
    ]
    return KpiParametersSnapshot(
        cached_at=time.monotonic(),
        users=tuple(
            ReportsDropdownOption(
                value=str(row.id),
                label=f"{row.name} - {row.email}",
            )
            for row in user_rows
        ),
        plants=tuple(
            ReportsDropdownOption(
                value=str(row.id),
                label=f"{row.plant_code} - {row.name}",
            )
            for row in plant_rows
        ),
        product_category=tuple(
            ReportsDropdownOption(
                value=product_category_pair_value(category_type, sub_category_type),
                label=product_category_pair_label(category_type, sub_category_type),
            )
            for category_type, sub_category_type in category_pairs
        ),
        product_category_pairs=tuple(category_pairs),
        gradings=tuple(
            ReportsDropdownOption(value=e.value, label=e.value) for e in DamageGrading
        ),
        warehouse_rows=tuple(
            WarehouseRow(
                id=row.id,
                warehouse_code=row.warehouse_code,
                name=row.name,
            )
            for row in warehouse_rows
        ),
    )
