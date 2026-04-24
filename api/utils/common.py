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


def empty_pass_fail_counts() -> dict[str, int]:
    return {"pass": 0, "fail": 0}


def device_display_label(device: object | None) -> str:
    if device is None:
        return ""
    fp = (getattr(device, "device_fingerprint", None) or "").strip()
    if fp:
        return fp
    return (getattr(device, "imei", None) or "").strip()
