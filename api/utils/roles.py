"""API role names and role lists for ``check_api_role`` decorators."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from mod.model import User

ROLE_SUPERADMIN = "superadmin"
ROLE_MANAGER = "manager"
ROLE_BIZ_ADMIN = "biz-admin"
ROLE_OPERATOR = "operator"

ROLES_DASHBOARD = [ROLE_SUPERADMIN, ROLE_MANAGER, ROLE_BIZ_ADMIN]
ROLES_INSPECTION = [ROLE_SUPERADMIN, ROLE_MANAGER, ROLE_BIZ_ADMIN, ROLE_OPERATOR]
ROLES_INSPECTION_LEAD = [ROLE_SUPERADMIN, ROLE_MANAGER, ROLE_BIZ_ADMIN]
ROLES_MASTER_READ = [ROLE_SUPERADMIN, ROLE_MANAGER, ROLE_BIZ_ADMIN]
ROLES_MASTER_WRITE = [ROLE_SUPERADMIN, ROLE_MANAGER]
ROLES_MANAGER_NOTIFICATION = [ROLE_MANAGER, ROLE_BIZ_ADMIN]


def roles_from_request(request: Request) -> list[str]:
    role_raw = getattr(request.state, "role", None) or ""
    return [r.strip() for r in str(role_raw).split(",") if r.strip()]


def request_has_superadmin(request: Request) -> bool:
    return ROLE_SUPERADMIN in roles_from_request(request)


def request_is_operator_only(request: Request) -> bool:
    roles = roles_from_request(request)
    return (
        ROLE_OPERATOR in roles
        and ROLE_SUPERADMIN not in roles
        and ROLE_MANAGER not in roles
        and ROLE_BIZ_ADMIN not in roles
    )


def user_warehouse_codes_for_request(
    db: Session,
    request: Request,
) -> list[str] | None:
    """``None`` = superadmin (unscoped). Otherwise assigned warehouse codes (may be empty)."""
    if request_has_superadmin(request):
        return None
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = (
        db.query(User)
        .options(joinedload(User.warehouses_scope))
        .filter(User.id == int(user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return list(dict.fromkeys(user.allowed_warehouse))


def intersect_requested_warehouse_codes(
    db: Session,
    request: Request,
    requested_codes: list[str] | None,
) -> list[str] | None:
    """Restrict analytics warehouse filters to the caller's assigned warehouses."""
    allowed = user_warehouse_codes_for_request(db, request)
    if allowed is None:
        return requested_codes
    allowed_set = set(allowed)
    if not allowed_set:
        return []
    if not requested_codes:
        return allowed
    filtered = [code for code in requested_codes if code in allowed_set]
    if len(filtered) != len(requested_codes):
        raise HTTPException(
            status_code=403,
            detail="One or more warehouses are outside your assigned scope",
        )
    return filtered


def assert_warehouse_code_in_request_scope(
    db: Session,
    request: Request,
    warehouse_code: str,
) -> None:
    allowed = user_warehouse_codes_for_request(db, request)
    if allowed is None:
        return
    if warehouse_code not in set(allowed):
        raise HTTPException(
            status_code=403,
            detail="Not allowed to access this warehouse",
        )


def filter_warehouse_ids_for_request(
    db: Session,
    request: Request,
    warehouse_rows: list,
) -> list:
    """Filter warehouse ORM rows to those in the caller's scope (superadmin: all)."""
    allowed = user_warehouse_codes_for_request(db, request)
    if allowed is None:
        return warehouse_rows
    allowed_set = set(allowed)
    return [row for row in warehouse_rows if row.warehouse_code in allowed_set]


def warehouse_uuid_allowed_for_request(
    db: Session,
    request: Request,
    warehouse_uuid: uuid.UUID,
    *,
    get_warehouse_by_uuid,
) -> str:
    warehouse = get_warehouse_by_uuid(db, warehouse_uuid)
    assert_warehouse_code_in_request_scope(db, request, warehouse.warehouse_code)
    return warehouse.warehouse_code
