import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from mod.api.ip_metadata.helper import get_ip_metadata_by_addresses
from mod.api.login.helper import (
    apply_login_status_filter,
    is_login_event_query,
    is_login_payload,
    is_successful_login_payload,
    map_login_detail,
    map_login_inspection,
    map_login_list_item,
    parse_log_payload,
)
from mod.api.login.response import (
    LoginDetailResponse,
    LoginKpiResponse,
    LoginListResponse,
)
from mod.api.middleware import auth_dependency
from mod.api.log.audit import ACTION_AUTH_LOGIN
from mod.model import Device, Inspection, Log, User
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    get_pagination_params,
    paginate_query,
)

router = APIRouter(
    tags=["Logins"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/logins/kpi",
    name="get_logins_kpi",
    description="Get login KPIs",
    response_model=LoginKpiResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_logins_kpi(
    request: Request,
    db: Session = Depends(get_db),
):
    base_query = is_login_event_query(db.query(Log))

    total = base_query.count()
    successful = apply_login_status_filter(base_query, "successful").count()
    failed = apply_login_status_filter(base_query, "failed").count()
    unique_users = (
        base_query.filter(Log.user_id.isnot(None))
        .with_entities(func.count(func.distinct(Log.user_id)))
        .scalar()
        or 0
    )

    return LoginKpiResponse(
        total=total,
        successful=successful,
        failed=failed,
        unique_users=unique_users,
    )


@router.get(
    "/logins",
    name="get_logins",
    description="Paginated login activity with IP geolocation metadata",
    response_model=LoginListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_logins(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    status: str | None = Query(None, pattern="^(successful|failed)$"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Log, User, Device)
        .outerjoin(User, Log.user_id == User.id)
        .outerjoin(Device, Log.device_id == Device.id)
    )
    query = is_login_event_query(query)
    query = apply_login_status_filter(query, status)

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[User.name, User.email, Log.log_value],
        date_fields={
            "created_at": Log.created_at,
            "updated_at": Log.updated_at,
        },
        sort_fields={
            "id": Log.id,
            "created_at": Log.created_at,
            "updated_at": Log.updated_at,
        },
        default_sort_field="created_at",
    )

    total = query.count()
    page = params.page if params.page >= 1 else 1
    per_page = params.per_page if params.per_page >= 1 else 1
    rows = paginate_query(query, page=page, per_page=per_page).all()

    ip_addresses = [
        str(parse_log_payload(log.log_value).get("ip") or "").strip()
        for log, _, _ in rows
    ]
    metadata_by_ip = get_ip_metadata_by_addresses(db, ip_addresses)

    data = []
    for log, user, device in rows:
        ip_address = str(parse_log_payload(log.log_value).get("ip") or "").strip() or None
        data.append(
            map_login_list_item(
                log=log,
                user=user,
                device=device,
                ip_metadata=metadata_by_ip.get(ip_address) if ip_address else None,
            )
        )

    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return LoginListResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get(
    "/logins/{log_uuid}",
    name="get_login_detail",
    description="Get login activity detail by uuid",
    response_model=LoginDetailResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_login_detail(
    request: Request,
    log_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    row = (
        db.query(Log, User, Device)
        .outerjoin(User, Log.user_id == User.id)
        .outerjoin(Device, Log.device_id == Device.id)
        .filter(Log.uuid == log_uuid, Log.is_active.is_(True))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Login record not found")

    log, user, device = row
    payload = parse_log_payload(log.log_value)
    if not is_login_payload(payload):
        raise HTTPException(status_code=404, detail="Login record not found")

    ip_address = str(payload.get("ip") or "").strip() or None
    metadata_by_ip = get_ip_metadata_by_addresses(db, [ip_address] if ip_address else [])
    response = map_login_detail(
        log=log,
        user=user,
        device=device,
        ip_metadata=metadata_by_ip.get(ip_address) if ip_address else None,
    )

    if is_successful_login_payload(payload) and log.device_id is not None:
        next_login = (
            db.query(Log)
            .filter(
                Log.is_active.is_(True),
                Log.created_at > log.created_at,
                Log.device_id == log.device_id,
                Log.user_id == log.user_id,
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
            )
            .order_by(Log.created_at.asc())
            .first()
        )

        inspections_query = db.query(Inspection).filter(
            Inspection.device_id == log.device_id,
            Inspection.created_at >= log.created_at,
        )
        if log.user_id is not None:
            inspections_query = inspections_query.filter(
                Inspection.inspector_id == log.user_id
            )
        if next_login is not None:
            inspections_query = inspections_query.filter(
                Inspection.created_at < next_login.created_at
            )

        inspections = (
            inspections_query.options(
                joinedload(Inspection.product),
            )
            .order_by(Inspection.created_at.asc())
            .all()
        )
        response.inspections = [map_login_inspection(item) for item in inspections]
        response.inspections_done = len(response.inspections)

    return response
