import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.plant.helper import map_plant
from mod.api.plant.request import PlantCreateRequest, PlantUpdateRequest
from mod.api.plant.response import PlantListResponse, PlantResponse
from mod.model import Plant
from utils.common import read_csv_upload, to_proper_case
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Plants"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/plants",
    name="get_plants",
    description="List plants with pagination and filters",
    response_model=PlantListResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_plants(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    query = db.query(Plant).filter(Plant.is_active.is_(is_active))

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[Plant.plant_code, Plant.name, Plant.city],
        date_fields={
            "created_at": Plant.created_at,
            "updated_at": Plant.updated_at,
        },
        sort_fields={
            "id": Plant.id,
            "plant_code": Plant.plant_code,
            "name": Plant.name,
            "city": Plant.city,
            "created_at": Plant.created_at,
            "updated_at": Plant.updated_at,
        },
        default_sort_field="id",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_plant,
    )


@router.post(
    "/plants",
    name="create_plant",
    description="Create plant",
    response_model=PlantResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def create_plant(
    request: Request,
    payload: PlantCreateRequest,
    db: Session = Depends(get_db),
):
    existing_code = db.query(Plant).filter(Plant.plant_code == payload.plant_code).first()
    if existing_code is not None:
        raise HTTPException(status_code=409, detail="Plant code already exists")

    existing_name = db.query(Plant).filter(Plant.name == payload.name).first()
    if existing_name is not None:
        raise HTTPException(status_code=409, detail="Plant name already exists")

    plant = Plant(
        plant_code=payload.plant_code,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        address=payload.address,
        city=to_proper_case(payload.city),
        postal_code=str(payload.postal_code),
        is_active=True,
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return map_plant(plant)


@router.get(
    "/plants/{plant_uuid}",
    name="get_plant_info",
    description="Get plant details",
    response_model=PlantResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_plant_info(
    request: Request,
    plant_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    plant = db.query(Plant).filter(Plant.uuid == plant_uuid).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    return map_plant(plant)


@router.put(
    "/plants/{plant_uuid}",
    name="update_plant",
    description="Update plant",
    response_model=PlantResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def update_plant(
    request: Request,
    plant_uuid: uuid.UUID,
    payload: PlantUpdateRequest,
    db: Session = Depends(get_db),
):
    plant = db.query(Plant).filter(Plant.uuid == plant_uuid).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")

    duplicate_code = (
        db.query(Plant)
        .filter(Plant.plant_code == payload.plant_code, Plant.id != plant.id)
        .first()
    )
    if duplicate_code is not None:
        raise HTTPException(status_code=409, detail="Plant code already exists")

    duplicate_name = (
        db.query(Plant).filter(Plant.name == payload.name, Plant.id != plant.id).first()
    )
    if duplicate_name is not None:
        raise HTTPException(status_code=409, detail="Plant name already exists")

    plant.plant_code = payload.plant_code
    plant.name = payload.name
    plant.lat = payload.lat
    plant.lng = payload.lng
    plant.address = payload.address
    plant.city = to_proper_case(payload.city)
    plant.postal_code = str(payload.postal_code)
    plant.is_active = payload.is_active

    db.commit()
    db.refresh(plant)
    return map_plant(plant)


@router.delete(
    "/plants/{plant_uuid}",
    name="delete_plant",
    description="Delete (deactivate) plant",
    response_model=PlantResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def delete_plant(
    request: Request,
    plant_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    plant = db.query(Plant).filter(Plant.uuid == plant_uuid).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")

    plant.is_active = False
    db.commit()
    db.refresh(plant)
    return map_plant(plant)


@router.get(
    "/plants/csv/template",
    name="download_plants_csv_template",
    description="Download plant CSV template with existing data",
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def download_plants_csv_template(
    request: Request,
    db: Session = Depends(get_db),
):
    plants = db.query(Plant).order_by(Plant.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "plant_code",
            "name",
            "address",
            "city",
            "lat",
            "lng",
            "postal_code",
            "is_active",
        ]
    )

    for plant in plants:
        writer.writerow(
            [
                plant.plant_code,
                plant.name,
                plant.address,
                plant.city,
                plant.lat if plant.lat is not None else "",
                plant.lng if plant.lng is not None else "",
                plant.postal_code,
                "true" if plant.is_active else "false",
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="plants_template.csv"'},
    )


@router.post(
    "/plants/csv/upload",
    name="upload_plants_csv",
    description="Bulk upsert plants from CSV",
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def upload_plants_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    required_headers = {
        "plant_code",
        "name",
        "address",
        "city",
        "lat",
        "lng",
        "postal_code",
    }
    rows = read_csv_upload(file=file, required_headers=required_headers)

    valid_rows: list[dict[str, object]] = []
    skipped = 0
    errors: list[str] = []
    seen_codes: set[str] = set()

    for row_number, row in enumerate(rows, start=2):
        plant_code = (row.get("plant_code") or "").strip()
        name = (row.get("name") or "").strip()
        address = (row.get("address") or "").strip()
        city = to_proper_case((row.get("city") or ""))
        lat_raw = (row.get("lat") or "").strip()
        lng_raw = (row.get("lng") or "").strip()
        postal_code_raw = (row.get("postal_code") or "").strip()
        is_active_raw = (row.get("is_active") or "true").strip().lower()

        if not all([plant_code, name, address, city, lat_raw, lng_raw, postal_code_raw]):
            skipped += 1
            errors.append(f"Row {row_number}: required field is missing")
            continue

        if plant_code in seen_codes:
            skipped += 1
            errors.append(f"Row {row_number}: duplicate plant_code in same upload ({plant_code})")
            continue
        seen_codes.add(plant_code)

        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
            postal_code = int(postal_code_raw)
            if postal_code < 0:
                raise ValueError("postal code must be non-negative")
        except ValueError as ex:
            skipped += 1
            errors.append(f"Row {row_number}: invalid numeric value ({str(ex)})")
            continue

        is_active = is_active_raw not in {"false", "0", "no"}
        valid_rows.append(
            {
                "plant_code": plant_code,
                "name": name,
                "address": address,
                "city": city,
                "lat": lat,
                "lng": lng,
                "postal_code": str(postal_code),
                "is_active": is_active,
            }
        )

    if valid_rows:
        existing_codes = {
            code
            for (code,) in db.query(Plant.plant_code)
            .filter(Plant.plant_code.in_([r["plant_code"] for r in valid_rows]))
            .all()
        }

        stmt = insert(Plant).values(valid_rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Plant.plant_code],
            set_={
                "name": stmt.excluded.name,
                "address": stmt.excluded.address,
                "city": stmt.excluded.city,
                "lat": stmt.excluded.lat,
                "lng": stmt.excluded.lng,
                "postal_code": stmt.excluded.postal_code,
                "is_active": stmt.excluded.is_active,
            },
        )
        try:
            db.execute(stmt)
            db.commit()
        except IntegrityError as ex:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"CSV upsert failed due to unique constraint conflict: {str(ex.orig)}",
            )

        created = len([r for r in valid_rows if r["plant_code"] not in existing_codes])
        updated = len(valid_rows) - created
    else:
        created = 0
        updated = 0

    return {
        "success": True,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
