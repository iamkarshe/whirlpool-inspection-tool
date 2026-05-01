import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from mod.api.user.response import UserResponse
from mod.model import Plant, User, Warehouse


def forbid_superadmin_role_assignment(role_row: object) -> None:
    """Block API from assigning DB roles whose name is superadmin."""
    name = getattr(role_row, "role", "") or ""
    if str(name).lower() == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Superadmin role cannot be assigned via this API",
        )


def user_with_role_and_scope(db: Session, user_uuid: uuid.UUID) -> User | None:
    return (
        db.query(User)
        .options(
            joinedload(User.role),
            selectinload(User.warehouses_scope),
            selectinload(User.plants_scope),
        )
        .filter(User.uuid == user_uuid)
        .first()
    )


def map_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        mobile_number=user.mobile_number,
        role=user.role.role,
        designation=user.designation,
        is_active=bool(user.is_active),
        allowed_warehouse=list(user.allowed_warehouse),
        allowed_plants=list(user.allowed_plants),
    )


def apply_user_facility_scope(
    db: Session,
    user: User,
    *,
    warehouse_codes: list[str] | None,
    plant_codes: list[str] | None,
) -> None:
    if warehouse_codes is not None:
        unique_wh = list(dict.fromkeys(warehouse_codes))
        rows = (
            db.query(Warehouse)
            .filter(Warehouse.warehouse_code.in_(unique_wh))
            .all()
        )
        found = {w.warehouse_code for w in rows}
        if len(found) != len(unique_wh):
            missing = [c for c in unique_wh if c not in found]
            raise HTTPException(
                status_code=422,
                detail=f"Unknown warehouse_code(s): {missing}",
            )
        user.warehouses_scope = rows
    if plant_codes is not None:
        unique_pc = list(dict.fromkeys(plant_codes))
        rows = db.query(Plant).filter(Plant.plant_code.in_(unique_pc)).all()
        found = {p.plant_code for p in rows}
        if len(found) != len(unique_pc):
            missing = [c for c in unique_pc if c not in found]
            raise HTTPException(
                status_code=422,
                detail=f"Unknown plant_code(s): {missing}",
            )
        user.plants_scope = rows
