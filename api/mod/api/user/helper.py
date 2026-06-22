import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload, selectinload

from mod.api.user.response import UserResponse
from mod.api.vpn.helper import (
    create_vpn_device,
    fetch_vpn_device_config,
    fetch_vpn_device_qr,
    revoke_vpn_device,
    vpn_config_filename,
    vpn_qr_filename,
)
from mod.model import Plant, User, Warehouse
from utils.password_policy import resolve_password_change_flags


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
    must_change_password, password_expired = resolve_password_change_flags(user)
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
        vpn_device_uuid=user.vpn_device_uuid,
        vpn_device_name=user.vpn_device_name,
        vpn_device_type=user.vpn_device_type,
        vpn_provisioned_at=user.vpn_provisioned_at,
        must_change_password=must_change_password,
        password_expired=password_expired,
    )


def require_user_vpn_device_uuid(user: User) -> uuid.UUID:
    if user.vpn_device_uuid is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not have a VPN profile",
        )
    return user.vpn_device_uuid


def clear_user_vpn_profile_fields(user: User) -> None:
    user.vpn_device_uuid = None
    user.vpn_device_name = None
    user.vpn_device_type = None
    user.vpn_provisioned_at = None


def revoke_user_vpn_profile(user: User) -> None:
    if user.vpn_device_uuid is None:
        return
    revoke_vpn_device(user.vpn_device_uuid)
    clear_user_vpn_profile_fields(user)


def generate_user_vpn_profile(
    db: Session,
    *,
    user_uuid: uuid.UUID,
    device_name: str | None,
    device_type: str,
) -> User:
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if (user.role.role or "").lower() == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Cannot generate VPN profile for superadmin accounts",
        )

    resolved_device_name = (device_name or user.name).strip()
    if not resolved_device_name:
        raise HTTPException(
            status_code=422,
            detail="device_name could not be resolved",
        )

    if user.vpn_device_uuid is not None:
        revoke_user_vpn_profile(user)

    provisioned_device_uuid = create_vpn_device(
        user_name=user.name,
        user_email=user.email,
        device_name=resolved_device_name,
        device_type=device_type,
    )

    user.vpn_device_uuid = provisioned_device_uuid
    user.vpn_device_name = resolved_device_name
    user.vpn_device_type = device_type
    user.vpn_provisioned_at = datetime.now(timezone.utc)
    db.commit()

    loaded = user_with_role_and_scope(db, user_uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return loaded


def revoke_user_vpn_by_uuid(db: Session, user_uuid: uuid.UUID) -> User:
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if (user.role.role or "").lower() == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Cannot revoke VPN profile for superadmin accounts",
        )

    if user.vpn_device_uuid is None:
        raise HTTPException(
            status_code=404,
            detail="User does not have a VPN profile",
        )

    revoke_user_vpn_profile(user)
    db.commit()

    loaded = user_with_role_and_scope(db, user_uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return loaded


def download_user_vpn_config(user: User) -> Response:
    device_uuid = require_user_vpn_device_uuid(user)
    response = fetch_vpn_device_config(device_uuid)
    filename = vpn_config_filename(user.name, fallback_email=user.email)
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def download_user_vpn_qr(user: User) -> Response:
    device_uuid = require_user_vpn_device_uuid(user)
    response = fetch_vpn_device_qr(device_uuid)
    filename = vpn_qr_filename(user.name, fallback_email=user.email)
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


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
