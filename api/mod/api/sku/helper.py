from mod.api.sku.response import SkuResponse
from mod.model import Sku


def map_sku(sku: Sku) -> SkuResponse:
    return SkuResponse(
        id=sku.id,
        uuid=sku.uuid,
        category=sku.category,
        sub_category=sku.sub_category,
        category_code=sku.category_code,
        category_description=sku.category_description,
        material_code=sku.material_code,
        material_description=sku.material_description,
        is_active=bool(sku.is_active),
        created_at=sku.created_at,
        updated_at=sku.updated_at,
    )
