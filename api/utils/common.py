import csv
import io
import math
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, UploadFile

from utils.env import get_env_optional

YES_NO_PASS_VALUES: frozenset[str] = frozenset({"yes", "y", "pass", "true", "1", "ok"})
YES_NO_FAIL_VALUES: frozenset[str] = frozenset({"no", "n", "fail", "false", "0"})

ALLOWED_REGISTRATION_EMAIL_DOMAINS_DEFAULT = ("*.whirlpool.in",)


def allowed_registration_email_domains() -> tuple[str, ...]:
    raw = get_env_optional("REGISTRATION_EMAIL_DOMAIN_WHITELIST")
    if raw is None:
        return ALLOWED_REGISTRATION_EMAIL_DOMAINS_DEFAULT
    domains = tuple(
        item.strip().lower() for item in raw.split(",") if item.strip()
    )
    return domains or ALLOWED_REGISTRATION_EMAIL_DOMAINS_DEFAULT


def registration_email_domain(email: str) -> str:
    normalized = normalize_login_email(email)
    if "@" not in normalized:
        return ""
    return normalized.rsplit("@", 1)[1]


def registration_domain_matches_pattern(domain: str, pattern: str) -> bool:
    normalized_domain = domain.strip().lower()
    normalized_pattern = pattern.strip().lower()
    if not normalized_domain or not normalized_pattern:
        return False
    if normalized_pattern.startswith("*."):
        base_domain = normalized_pattern[2:]
        domain_suffix = f".{base_domain}"
        return normalized_domain == base_domain or normalized_domain.endswith(
            domain_suffix
        )
    return normalized_domain == normalized_pattern


def is_allowed_registration_email(email: str) -> bool:
    domain = registration_email_domain(email)
    if not domain:
        return False
    return any(
        registration_domain_matches_pattern(domain, pattern)
        for pattern in allowed_registration_email_domains()
    )


def ensure_allowed_registration_email(email: str) -> None:
    if is_allowed_registration_email(email):
        return
    allowed = ", ".join(allowed_registration_email_domains())
    raise HTTPException(
        status_code=422,
        detail=f"Email domain is not allowed. Permitted domains: {allowed}",
    )


def normalize_login_email(email: str) -> str:
    return email.strip().lower()


def to_proper_case(value: str) -> str:
    return " ".join(word.capitalize() for word in value.strip().split())


def normalize_csv_header(name: str | None) -> str:
    if name is None:
        return ""
    return name.strip().lower()


def normalize_csv_row(row: dict[str, str | None]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for raw_key, raw_value in row.items():
        key = normalize_csv_header(raw_key)
        if not key:
            continue
        normalized[key] = (raw_value or "").strip()
    return normalized


def read_csv_upload(
    file: UploadFile, required_headers: set[str]
) -> list[dict[str, str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = file.file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV is empty")

    normalized_headers = {
        normalize_csv_header(header)
        for header in reader.fieldnames
        if normalize_csv_header(header)
    }
    required_normalized = {header.strip().lower() for header in required_headers}
    missing_headers = required_normalized.difference(normalized_headers)
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required headers: {', '.join(sorted(missing_headers))}",
        )

    return [normalize_csv_row(row) for row in reader]


def parse_yes_no_outcome(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v in YES_NO_PASS_VALUES:
        return "pass"
    if v in YES_NO_FAIL_VALUES:
        return "fail"
    return None


def checklist_inspection_layer_key(group_name: str | None) -> str | None:
    if not group_name or not group_name.strip():
        return None
    first = group_name.strip().lower().split()[0]
    if first == "outer":
        return "outer"
    if first == "inner":
        return "inner"
    if first == "product":
        return "product_checklist"
    return None


def utc_end_exclusive_day_range(
    date_from: date, date_to: date
) -> tuple[datetime, datetime]:
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
    end_exclusive = datetime.combine(
        date_to + timedelta(days=1), time.min, tzinfo=timezone.utc
    )
    return start, end_exclusive


def default_utc_calendar_dates_last_7_days() -> tuple[date, date]:
    """Inclusive UTC calendar dates: today and the prior 6 days (7 days total)."""
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=6)
    return start, end


def utc_today_calendar_date() -> date:
    """Current UTC calendar date."""
    return datetime.now(timezone.utc).date()


def resolve_inspection_kpi_period(
    period: str,
    date_from: date | None,
    date_to: date | None,
) -> tuple[date, date, str]:
    """Map a preset ``period`` to inclusive UTC ``date_from`` / ``date_to``.

    For ``custom``, both dates must be provided. Returns
    ``(date_from, date_to, normalized_period)``. Raises ``ValueError`` on invalid input.
    """
    p = (period or "custom").strip().lower()
    if p not in ("custom", "today", "yesterday", "week", "month"):
        raise ValueError("period must be one of: custom, today, yesterday, week, month")
    today = utc_today_calendar_date()
    if p == "custom":
        if date_from is None and date_to is None:
            df, dt = default_utc_calendar_dates_last_7_days()
            return df, dt, "custom"
        if date_from is None or date_to is None:
            raise ValueError("date_from and date_to must both be set or both omitted")
        return date_from, date_to, "custom"
    if p == "today":
        return today, today, "today"
    if p == "yesterday":
        d = today - timedelta(days=1)
        return d, d, "yesterday"
    if p == "week":
        # Monday–Sunday in UTC (ISO weekday: Monday = 0).
        start = today - timedelta(days=today.weekday())
        return start, today, "week"
    if p == "month":
        start = date(today.year, today.month, 1)
        return start, today, "month"
    raise ValueError("invalid period")


def empty_pass_fail_counts() -> dict[str, int]:
    return {"pass": 0, "fail": 0}


def device_display_label(device: object | None) -> str:
    if device is None:
        return ""
    fp = (getattr(device, "device_fingerprint", None) or "").strip()
    if fp:
        return fp
    return (getattr(device, "imei", None) or "").strip()


def parse_product_barcode_16(barcode: str) -> dict[str, str]:
    """Split a 16-character product barcode into fixed fields (1-based positions in spec)."""
    s = (barcode or "").strip()
    if len(s) != 16:
        raise ValueError("Barcode must be exactly 16 characters")
    material_code = s[0:5]
    compressor_code = s[5:7]
    manufacturing_year = s[7:9]
    week_of_year = s[9:11]
    serial_number = s[11:16]
    if not material_code.isdigit():
        raise ValueError("Material code (positions 1-5) must be five digits")
    if not compressor_code.isdigit():
        raise ValueError("Compressor code (positions 6-7) must be two digits")
    if not manufacturing_year.isdigit():
        raise ValueError("Manufacturing year (positions 8-9) must be two digits")
    if not week_of_year.isdigit():
        raise ValueError("Week of year (positions 10-11) must be two digits")
    week_int = int(week_of_year)
    if week_int < 1 or week_int > 53:
        raise ValueError("Week of year must be between 01 and 53")
    if not serial_number.isalnum():
        raise ValueError(
            "Serial number (positions 12-16) must be alphanumeric (letters or digits)"
        )
    return {
        "material_code": material_code,
        "compressor_code": compressor_code,
        "manufacturing_year": manufacturing_year,
        "week_of_year": week_of_year,
        "serial_number": serial_number,
    }


INDIA_LAT_MIN = 6.0
INDIA_LAT_MAX = 37.6
INDIA_LNG_MIN = 68.0
INDIA_LNG_MAX = 97.8

try:
    MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE = float(
        get_env_optional("MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE", 5)
    )
except (TypeError, ValueError):
    MAX_INSPECTION_DISTANCE_KM_FROM_WAREHOUSE = 5.0
    
def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    c = 2 * math.asin(min(1.0, math.sqrt(a)))
    return r_km * c


REGISTRATION_SPACE_DASH_PATTERN = re.compile(r"[\s\-_]+")
BHARAT_REGISTRATION_PATTERN = re.compile(r"^\d{2}BH\d{4}[A-Z]{2}$")
STATE_REGISTRATION_PATTERN = re.compile(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,5}$")


def normalize_registration(s: str) -> str:
    return REGISTRATION_SPACE_DASH_PATTERN.sub("", (s or "").upper())


def is_valid_registration(s: str) -> bool:
    n = normalize_registration(s)
    if len(n) < 8 or len(n) > 13:
        return False
    return bool(
        BHARAT_REGISTRATION_PATTERN.match(n) or STATE_REGISTRATION_PATTERN.match(n)
    )


DEFAULT_CLIENT_TIMEZONE = ZoneInfo("Asia/Kolkata")


def parse_to_utc_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=DEFAULT_CLIENT_TIMEZONE)
        return dt.astimezone(timezone.utc)
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(
            value, time.min, tzinfo=DEFAULT_CLIENT_TIMEZONE
        ).astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        sec = float(value) / 1000.0 if float(value) > 1e12 else float(value)
        return datetime.fromtimestamp(sec, tz=timezone.utc)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            raise ValueError("datetime value is required")
        if len(s) <= 10 and "T" not in s.upper():
            d = date.fromisoformat(s[:10])
            return datetime.combine(
                d, time.min, tzinfo=DEFAULT_CLIENT_TIMEZONE
            ).astimezone(timezone.utc)
        s_norm = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s_norm)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=DEFAULT_CLIENT_TIMEZONE)
        return dt.astimezone(timezone.utc)
    raise ValueError(
        "Unsupported datetime; use ISO-8601 string, epoch seconds/ms, or datetime"
    )
