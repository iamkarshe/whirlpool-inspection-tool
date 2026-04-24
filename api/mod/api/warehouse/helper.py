from mod.api.warehouse.response import WarehouseResponse
from mod.model import Warehouse


def map_warehouse(warehouse: Warehouse) -> WarehouseResponse:
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
    )
