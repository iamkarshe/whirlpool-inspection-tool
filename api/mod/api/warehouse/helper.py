import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.api.facility_metrics import FacilityStatsResponse, empty_facility_stats
from mod.api.warehouse.response import WarehouseResponse
from mod.model import Warehouse


def map_warehouse(
    warehouse: Warehouse,
    *,
    stats: FacilityStatsResponse | None = None,
) -> WarehouseResponse:
    return WarehouseResponse(
        id=warehouse.id,
        uuid=warehouse.uuid,
        warehouse_code=warehouse.warehouse_code,
        name=warehouse.name,
        lat=warehouse.lat,
        lng=warehouse.lng,
        address=warehouse.address,
        city=warehouse.city,
        postal_code=warehouse.postal_code,
        is_active=bool(warehouse.is_active),
        created_at=warehouse.created_at,
        updated_at=warehouse.updated_at,
        stats=stats if stats is not None else empty_facility_stats(),
    )


def get_warehouse_by_uuid_or_404(db: Session, warehouse_uuid: uuid.UUID) -> Warehouse:
    warehouse = db.query(Warehouse).filter(Warehouse.uuid == warehouse_uuid).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse
