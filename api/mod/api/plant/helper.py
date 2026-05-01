import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.api.facility_metrics import FacilityStatsResponse, empty_facility_stats
from mod.api.plant.response import PlantResponse
from mod.model import Plant


def get_plant_by_uuid_or_404(db: Session, plant_uuid: uuid.UUID) -> Plant:
    plant = db.query(Plant).filter(Plant.uuid == plant_uuid).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


def map_plant(
    plant: Plant,
    *,
    stats: FacilityStatsResponse | None = None,
) -> PlantResponse:
    return PlantResponse(
        id=plant.id,
        uuid=plant.uuid,
        plant_code=plant.plant_code,
        name=plant.name,
        lat=plant.lat,
        lng=plant.lng,
        address=plant.address,
        city=plant.city,
        postal_code=plant.postal_code,
        is_active=bool(plant.is_active),
        created_at=plant.created_at,
        updated_at=plant.updated_at,
        stats=stats if stats is not None else empty_facility_stats(),
    )
