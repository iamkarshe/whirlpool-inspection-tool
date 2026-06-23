from __future__ import annotations

from typing import Any, TypeVar

from sqlalchemy.orm import Session

from utils.common import to_proper_case

FacilityModel = TypeVar("FacilityModel")


def parse_facility_csv_row(
    row_number: int,
    row: dict[str, str],
    *,
    code_field: str,
    seen_codes: set[str],
) -> tuple[dict[str, Any] | None, str | None]:
    code_value = (row.get(code_field) or "").strip()
    name = (row.get("name") or "").strip()
    address = (row.get("address") or "").strip()
    city = to_proper_case((row.get("city") or ""))
    lat_raw = (row.get("lat") or "").strip()
    lng_raw = (row.get("lng") or "").strip()
    postal_code_raw = (row.get("postal_code") or "").strip()
    is_active_raw = (row.get("is_active") or "true").strip().lower()

    if not all([code_value, name, address, city, lat_raw, lng_raw, postal_code_raw]):
        return None, f"Row {row_number}: required field is missing"

    if code_value in seen_codes:
        return (
            None,
            f"Row {row_number}: duplicate {code_field} in same upload ({code_value})",
        )

    try:
        lat = float(lat_raw)
        lng = float(lng_raw)
        postal_code = int(postal_code_raw)
        if postal_code < 0:
            raise ValueError("postal code must be non-negative")
    except ValueError as ex:
        return None, f"Row {row_number}: invalid numeric value ({str(ex)})"

    is_active = is_active_raw not in {"false", "0", "no"}
    seen_codes.add(code_value)

    return (
        {
            code_field: code_value,
            "name": name,
            "address": address,
            "city": city,
            "lat": lat,
            "lng": lng,
            "postal_code": str(postal_code),
            "is_active": is_active,
        },
        None,
    )


def release_facility_name_conflict(
    db: Session,
    model: type[FacilityModel],
    *,
    code_attr: str,
    code_value: str,
    name: str,
) -> None:
    code_column = getattr(model, code_attr)
    name_column = model.name
    conflicting_rows = (
        db.query(model)
        .filter(
            name_column == name,
            code_column != code_value,
        )
        .all()
    )
    for row in conflicting_rows:
        existing_code = getattr(row, code_attr)
        backup_name = f"{name} ({existing_code})"
        row.name = backup_name[:120]
    if conflicting_rows:
        db.flush()


def upsert_facility_row(
    db: Session,
    model: type[FacilityModel],
    *,
    code_attr: str,
    row_data: dict[str, Any],
) -> str:
    code_value = str(row_data[code_attr])
    release_facility_name_conflict(
        db,
        model,
        code_attr=code_attr,
        code_value=code_value,
        name=str(row_data["name"]),
    )

    code_column = getattr(model, code_attr)
    existing = db.query(model).filter(code_column == code_value).first()
    if existing is not None:
        for field, value in row_data.items():
            setattr(existing, field, value)
        return "updated"

    db.add(model(**row_data))
    return "created"


def bulk_upsert_facility_rows(
    db: Session,
    model: type[FacilityModel],
    *,
    code_attr: str,
    valid_rows: list[dict[str, Any]],
) -> tuple[int, int]:
    created = 0
    updated = 0
    for row_data in valid_rows:
        outcome = upsert_facility_row(
            db,
            model,
            code_attr=code_attr,
            row_data=row_data,
        )
        if outcome == "created":
            created += 1
        else:
            updated += 1
    return created, updated
