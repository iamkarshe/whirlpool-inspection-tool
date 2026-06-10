import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.api.facility_metrics import FacilityStatsResponse, empty_facility_stats
from mod.api.plant.response import PlantResponse
from mod.model import Inspection, Plant


def get_plant_by_uuid_or_404(db: Session, plant_uuid: uuid.UUID) -> Plant:
    plant = db.query(Plant).filter(Plant.uuid == plant_uuid).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


def count_inspections_for_plant(db: Session, plant_code: str) -> int:
    return (
        db.query(Inspection.id)
        .filter(Inspection.supplier_plant_code == plant_code)
        .count()
    )


def permanently_delete_plant(db: Session, plant: Plant) -> str:
    plant_code = plant.plant_code
    inspection_count = count_inspections_for_plant(db, plant_code)
    if inspection_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete plant {plant_code}: "
                f"{inspection_count} inspection(s) still reference it"
            ),
        )
    db.delete(plant)
    return plant_code


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
