import csv
import io
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, UploadFile

YES_NO_PASS_VALUES: frozenset[str] = frozenset(
    {"yes", "y", "pass", "true", "1", "ok"}
)
YES_NO_FAIL_VALUES: frozenset[str] = frozenset(
    {"no", "n", "fail", "false", "0"}
)


def to_proper_case(value: str) -> str:
    return " ".join(word.capitalize() for word in value.strip().split())


def read_csv_upload(file: UploadFile, required_headers: set[str]) -> list[dict[str, str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = file.file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV is empty")

    missing_headers = required_headers.difference(set(reader.fieldnames))
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required headers: {', '.join(sorted(missing_headers))}",
        )

    return [dict(row) for row in reader]


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


def utc_end_exclusive_day_range(date_from: date, date_to: date) -> tuple[datetime, datetime]:
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
