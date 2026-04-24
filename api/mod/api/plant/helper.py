from mod.api.plant.response import PlantResponse
from mod.model import Plant


def map_plant(plant: Plant) -> PlantResponse:
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
    )
