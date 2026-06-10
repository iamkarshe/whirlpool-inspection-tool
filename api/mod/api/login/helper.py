import json
from datetime import datetime, time, timedelta, timezone
from typing import Any
from urllib.parse import quote

from sqlalchemy import Float, and_, case, cast, func, or_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Query, Session

from mod.api.ip_metadata.helper import (
    get_ip_metadata_by_addresses,
    normalize_ip_address,
    refresh_ip_metadata_on_demand,
)
from utils.common import utc_end_exclusive_day_range
from utils.pagination import PaginationParams

from mod.api.log.audit import ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED
from mod.api.login.response import (
    LoginDetailResponse,
    LoginInspectionResponse,
    LoginIpDetailResponse,
    LoginIpExternalLinksResponse,
    LoginIpHealthResponse,
    LoginIpMetadataResponse,
    LoginIpRecentUserResponse,
    LoginIpSummaryItemResponse,
    LoginListItemResponse,
)
from mod.model import Device, Inspection, IpAddressMetadata, Log, User


def parse_log_payload(raw_value: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_value) if raw_value else {}
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def parse_device_info(raw_value: str) -> Any:
    try:
        parsed = json.loads(raw_value) if raw_value else {}
        return parsed if isinstance(parsed, (dict, list)) else raw_value
    except json.JSONDecodeError:
        return raw_value or {}


def is_login_event_query(query: Query) -> Query:
    return query.filter(
        Log.is_active.is_(True),
        or_(
            Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
            Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
            Log.log_value.ilike('%"event": "login"%'),
            Log.log_value.ilike('%"event": "login_failed"%'),
        ),
    )


def apply_login_status_filter(query: Query, status: str | None) -> Query:
    if status == "successful":
        return query.filter(
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
                Log.log_value.ilike('%"event": "login"%'),
            )
        )
    if status == "failed":
        return query.filter(
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
            )
        )
    return query


def is_login_payload(payload: dict[str, Any]) -> bool:
    action = str(payload.get("action", "")).strip().lower()
    if action in {ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED}:
        return True
    event = str(payload.get("event", "")).strip().lower()
    return event in {"login", "login_failed"}


def is_successful_login_payload(payload: dict[str, Any]) -> bool:
    action = str(payload.get("action", "")).strip().lower()
    if action == ACTION_AUTH_LOGIN:
        return True
    event = str(payload.get("event", "")).strip().lower()
    return event == "login"


def resolve_status(payload: dict[str, Any]) -> str:
    action = str(payload.get("action", "")).strip().lower()
    if action == ACTION_AUTH_LOGIN_FAILED:
        return "failed"
    if action == ACTION_AUTH_LOGIN:
        return "successful"
    event = str(payload.get("event", "")).strip().lower()
    if event == "login_failed":
        return "failed"
    return "successful"


def resolve_attempted_email(payload: dict[str, Any], user: User | None) -> str | None:
    for key in ("attempted_email", "login_email", "email"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    if user is not None and user.email:
        return user.email
    return None


def resolve_failure_reason(payload: dict[str, Any]) -> str | None:
    if resolve_status(payload) != "failed":
        return None
    reason = payload.get("reason") or payload.get("message")
    if isinstance(reason, str) and reason.strip():
        return reason.strip()
    return None


def resolve_device_source(
    payload: dict[str, Any], device: Device | None, default: str = "N/A"
) -> str:
    user_agent = payload.get("user_agent")
    if isinstance(user_agent, str) and user_agent.strip():
        return user_agent.strip()

    if device is None:
        return default

    if device.device_info:
        return str(device.device_info)

    return default


def map_ip_metadata(
    metadata: IpAddressMetadata | None,
) -> LoginIpMetadataResponse | None:
    if metadata is None:
        return None
    status = metadata.lookup_status.value if hasattr(metadata.lookup_status, "value") else str(metadata.lookup_status)
    return LoginIpMetadataResponse(
        country_code=metadata.country_code,
        country_name=metadata.country_name,
        region=metadata.region,
        city=metadata.city,
        isp=metadata.isp,
        lookup_status=status,
    )


def build_reference_id(log_id: int) -> str:
    return f"log-{log_id:03d}"


def map_login_list_item(
    log: Log,
    user: User | None,
    device: Device | None,
    ip_metadata: IpAddressMetadata | None = None,
) -> LoginListItemResponse:
    payload = parse_log_payload(log.log_value)
    attempted_email = resolve_attempted_email(payload, user)
    return LoginListItemResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else attempted_email,
        attempted_email=attempted_email,
        login_method=payload.get("login_method"),
        failure_reason=resolve_failure_reason(payload),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        proxy_ip_address=payload.get("proxy_ip"),
        ip_metadata=map_ip_metadata(ip_metadata),
        device_source=resolve_device_source(payload=payload, device=device),
        status=resolve_status(payload),
    )


def map_login_detail(
    log: Log,
    user: User | None,
    device: Device | None,
    ip_metadata: IpAddressMetadata | None = None,
) -> LoginDetailResponse:
    payload = parse_log_payload(log.log_value)
    attempted_email = resolve_attempted_email(payload, user)
    return LoginDetailResponse(
        id=log.id,
        uuid=log.uuid,
        reference_id=build_reference_id(log.id),
        user_name=user.name if user else "N/A",
        email=user.email if user else attempted_email,
        attempted_email=attempted_email,
        login_method=payload.get("login_method"),
        failure_reason=resolve_failure_reason(payload),
        logged_at=log.created_at,
        ip_address=payload.get("ip"),
        proxy_ip_address=payload.get("proxy_ip"),
        ip_metadata=map_ip_metadata(ip_metadata),
        device_source=resolve_device_source(payload=payload, device=device),
        user_agent=payload.get("user_agent"),
        status=resolve_status(payload),
        device_info=parse_device_info(device.device_info) if device else {},
        inspections_done=0,
        inspections=[],
    )


ABUSIVE_MIN_FAILED_ATTEMPTS = 5
ABUSIVE_MIN_TOTAL_FOR_RATE = 3
ABUSIVE_FAILURE_RATE_THRESHOLD = 0.7
ABUSIVE_HIGH_VOLUME_THRESHOLD = 20
LOGIN_IP_RECENT_LOGINS_LIMIT = 100
LOGIN_IP_RECENT_USERS_LIMIT = 10


def build_login_ip_external_links(ip_address: str) -> LoginIpExternalLinksResponse:
    normalized = normalize_ip_address(ip_address) or str(ip_address).strip()
    encoded = quote(normalized, safe="")
    return LoginIpExternalLinksResponse(
        abuseipdb=f"https://www.abuseipdb.com/check/{encoded}",
        ipinfo=f"https://ipinfo.io/{encoded}",
    )


def login_log_ip_expression():
    return cast(Log.log_value, JSONB)["ip"].astext


def apply_login_ip_filter(query: Query, ip_address: str) -> Query:
    return query.filter(login_log_ip_expression() == ip_address)


def login_logs_for_ip_query(db: Session, ip_address: str) -> Query:
    query = db.query(Log).filter(Log.is_active.is_(True))
    query = is_login_event_query(query)
    return apply_login_ip_filter(query, ip_address)


def login_events_for_ip_query(db: Session, ip_address: str) -> Query:
    query = (
        db.query(Log, User, Device)
        .outerjoin(User, Log.user_id == User.id)
        .outerjoin(Device, Log.device_id == Device.id)
    )
    query = is_login_event_query(query)
    return apply_login_ip_filter(query, ip_address)


def resolve_ip_health_status(
    *,
    is_abusive: bool,
    failed_logins: int,
) -> str:
    if is_abusive:
        return "abusive"
    if failed_logins > 0:
        return "suspicious"
    return "healthy"


def login_failed_attempt_expression():
    return case(
        (
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
            ),
            1,
        ),
        else_=0,
    )


def login_successful_attempt_expression():
    return case(
        (
            or_(
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
                Log.log_value.ilike('%"event": "login"%'),
            ),
            1,
        ),
        else_=0,
    )


def assess_abusive_ip(
    *,
    total_logins: int,
    failed_logins: int,
    successful_logins: int,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if failed_logins >= ABUSIVE_MIN_FAILED_ATTEMPTS:
        reasons.append("high_failed_attempts")
    if (
        total_logins >= ABUSIVE_MIN_TOTAL_FOR_RATE
        and failed_logins / total_logins >= ABUSIVE_FAILURE_RATE_THRESHOLD
    ):
        reasons.append("high_failure_rate")
    if (
        total_logins >= ABUSIVE_HIGH_VOLUME_THRESHOLD
        and failed_logins > successful_logins
    ):
        reasons.append("high_volume_suspicious")
    if failed_logins >= 3 and successful_logins == 0:
        reasons.append("only_failures")
    return bool(reasons), reasons


def abusive_ip_having_clause(total_logins, failed_logins, successful_logins):
    return or_(
        failed_logins >= ABUSIVE_MIN_FAILED_ATTEMPTS,
        and_(
            total_logins >= ABUSIVE_MIN_TOTAL_FOR_RATE,
            cast(failed_logins, Float) / cast(total_logins, Float)
            >= ABUSIVE_FAILURE_RATE_THRESHOLD,
        ),
        and_(
            total_logins >= ABUSIVE_HIGH_VOLUME_THRESHOLD,
            failed_logins > successful_logins,
        ),
        and_(failed_logins >= 3, successful_logins == 0),
    )


def build_login_ip_summary_query(
    db: Session,
    params: PaginationParams,
    *,
    abusive_only: bool = False,
):
    ip_address = login_log_ip_expression()
    failed_logins = func.sum(login_failed_attempt_expression()).label("failed_logins")
    successful_logins = func.sum(login_successful_attempt_expression()).label(
        "successful_logins"
    )
    total_logins = func.count(Log.id).label("total_logins")
    unique_users = func.count(func.distinct(Log.user_id)).label("unique_users")
    first_seen_at = func.min(Log.created_at).label("first_seen_at")
    last_seen_at = func.max(Log.created_at).label("last_seen_at")

    query = (
        db.query(
            ip_address.label("ip_address"),
            total_logins,
            successful_logins,
            failed_logins,
            unique_users,
            first_seen_at,
            last_seen_at,
        )
        .filter(Log.is_active.is_(True))
    )
    query = is_login_event_query(query)
    query = query.filter(ip_address.isnot(None), ip_address != "")

    if params.search and params.search.strip():
        term = f"%{params.search.strip()}%"
        query = query.filter(ip_address.ilike(term))

    if params.date_from is not None and params.date_to is not None:
        start, end_exclusive = utc_end_exclusive_day_range(
            params.date_from, params.date_to
        )
        query = query.filter(
            Log.created_at >= start,
            Log.created_at < end_exclusive,
        )
    elif params.date_from is not None:
        start = datetime.combine(params.date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Log.created_at >= start)
    elif params.date_to is not None:
        end_exclusive = datetime.combine(
            params.date_to + timedelta(days=1),
            time.min,
            tzinfo=timezone.utc,
        )
        query = query.filter(Log.created_at < end_exclusive)

    query = query.group_by(ip_address)

    if abusive_only:
        query = query.having(
            abusive_ip_having_clause(total_logins, failed_logins, successful_logins)
        )

    sort_key = (params.sort_by or "failed_logins").strip()
    sort_dir = (params.sort_dir or "desc").lower()
    sort_columns = {
        "ip_address": ip_address,
        "total_logins": total_logins,
        "successful_logins": successful_logins,
        "failed_logins": failed_logins,
        "unique_users": unique_users,
        "first_seen_at": first_seen_at,
        "last_seen_at": last_seen_at,
    }
    sort_column = sort_columns.get(sort_key, failed_logins)
    if sort_dir == "desc":
        query = query.order_by(sort_column.desc(), ip_address.asc())
    else:
        query = query.order_by(sort_column.asc(), ip_address.asc())

    return query


def map_login_ip_summary_item(
    row: Any,
    ip_metadata: IpAddressMetadata | None = None,
) -> LoginIpSummaryItemResponse:
    total_logins = int(row.total_logins or 0)
    failed_logins = int(row.failed_logins or 0)
    successful_logins = int(row.successful_logins or 0)
    is_abusive, abusive_reasons = assess_abusive_ip(
        total_logins=total_logins,
        failed_logins=failed_logins,
        successful_logins=successful_logins,
    )
    ip_value = str(row.ip_address)
    return LoginIpSummaryItemResponse(
        ip_address=ip_value,
        total_logins=total_logins,
        successful_logins=successful_logins,
        failed_logins=failed_logins,
        unique_users=int(row.unique_users or 0),
        first_seen_at=row.first_seen_at,
        last_seen_at=row.last_seen_at,
        ip_metadata=map_ip_metadata(ip_metadata),
        is_abusive=is_abusive,
        abusive_reasons=abusive_reasons,
        external_links=build_login_ip_external_links(ip_value),
    )


def fetch_login_ip_summary_page(
    db: Session,
    params: PaginationParams,
    *,
    abusive_only: bool = False,
) -> tuple[list[LoginIpSummaryItemResponse], int, int, int, int]:
    from utils.pagination import paginate_query

    query = build_login_ip_summary_query(db, params, abusive_only=abusive_only)
    total = db.query(func.count()).select_from(query.subquery()).scalar() or 0
    page = params.page if params.page >= 1 else 1
    per_page = params.per_page if params.per_page >= 1 else 1
    rows = paginate_query(query, page=page, per_page=per_page).all()
    metadata_by_ip = get_ip_metadata_by_addresses(
        db, [str(row.ip_address) for row in rows]
    )
    data = [
        map_login_ip_summary_item(
            row,
            ip_metadata=metadata_by_ip.get(str(row.ip_address)),
        )
        for row in rows
    ]
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return data, total, page, per_page, total_pages


def fetch_login_ip_detail(
    db: Session,
    ip_address: str,
    *,
    refresh_metadata: bool = False,
) -> LoginIpDetailResponse | None:
    normalized = normalize_ip_address(ip_address)
    if normalized is None:
        return None

    stats_row = (
        login_logs_for_ip_query(db, normalized)
        .with_entities(
            func.count(Log.id).label("total_logins"),
            func.sum(login_successful_attempt_expression()).label("successful_logins"),
            func.sum(login_failed_attempt_expression()).label("failed_logins"),
            func.count(func.distinct(Log.user_id)).label("unique_users"),
            func.min(Log.created_at).label("first_seen_at"),
            func.max(Log.created_at).label("last_seen_at"),
        )
        .first()
    )
    if stats_row is None or int(stats_row.total_logins or 0) == 0:
        return None

    metadata_refresh_queued = refresh_ip_metadata_on_demand(
        db,
        normalized,
        created_by="login_ip_detail",
        force=refresh_metadata,
    )

    total_logins = int(stats_row.total_logins or 0)
    failed_logins = int(stats_row.failed_logins or 0)
    successful_logins = int(stats_row.successful_logins or 0)
    is_abusive, abusive_reasons = assess_abusive_ip(
        total_logins=total_logins,
        failed_logins=failed_logins,
        successful_logins=successful_logins,
    )
    metadata_by_ip = get_ip_metadata_by_addresses(db, [normalized])
    ip_metadata = metadata_by_ip.get(normalized)

    health = LoginIpHealthResponse(
        ip_address=normalized,
        health_status=resolve_ip_health_status(
            is_abusive=is_abusive,
            failed_logins=failed_logins,
        ),
        total_logins=total_logins,
        successful_logins=successful_logins,
        failed_logins=failed_logins,
        unique_users=int(stats_row.unique_users or 0),
        first_seen_at=stats_row.first_seen_at,
        last_seen_at=stats_row.last_seen_at,
        ip_metadata=map_ip_metadata(ip_metadata),
        is_abusive=is_abusive,
        abusive_reasons=abusive_reasons,
        external_links=build_login_ip_external_links(normalized),
    )

    recent_rows = (
        login_events_for_ip_query(db, normalized)
        .order_by(Log.created_at.desc())
        .limit(LOGIN_IP_RECENT_LOGINS_LIMIT)
        .all()
    )
    recent_logins = [
        map_login_list_item(log=log, user=user, device=device, ip_metadata=ip_metadata)
        for log, user, device in recent_rows
    ]

    user_stats = (
        login_logs_for_ip_query(db, normalized)
        .filter(Log.user_id.isnot(None))
        .with_entities(
            Log.user_id.label("user_id"),
            func.max(Log.created_at).label("last_login_at"),
            func.count(Log.id).label("login_count"),
        )
        .group_by(Log.user_id)
        .order_by(func.max(Log.created_at).desc())
        .limit(LOGIN_IP_RECENT_USERS_LIMIT)
        .all()
    )
    user_ids = [int(row.user_id) for row in user_stats if row.user_id is not None]
    users_by_id: dict[int, User] = {}
    if user_ids:
        users_by_id = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(user_ids)).all()
        }
    recent_users: list[LoginIpRecentUserResponse] = []
    for row in user_stats:
        user = users_by_id.get(int(row.user_id))
        recent_users.append(
            LoginIpRecentUserResponse(
                user_uuid=user.uuid if user is not None else None,
                user_name=user.name if user is not None else "N/A",
                email=user.email if user is not None else None,
                last_login_at=row.last_login_at,
                login_count=int(row.login_count or 0),
            )
        )

    return LoginIpDetailResponse(
        health=health,
        recent_logins=recent_logins,
        recent_users=recent_users,
        metadata_refresh_queued=metadata_refresh_queued,
    )


def map_login_inspection(inspection: Inspection) -> LoginInspectionResponse:
    return LoginInspectionResponse(
        id=inspection.id,
        uuid=inspection.uuid,
        inspection_type=inspection.inspection_type.value
        if hasattr(inspection.inspection_type, "value")
        else str(inspection.inspection_type),
        product_id=inspection.product_id,
        created_at=inspection.created_at,
    )
