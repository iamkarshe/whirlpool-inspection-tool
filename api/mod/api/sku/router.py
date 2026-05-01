import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.sku.helper import map_sku
from mod.api.sku.response import SkuListResponse, SkuResponse
from mod.model import Product, ProductCategory, Sku
from utils.common import read_csv_upload
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)

router = APIRouter(
    tags=["Skus"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get("/skus", response_model=SkuListResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_skus(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    query = db.query(Sku).filter(Sku.is_active.is_(is_active))
    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[
            Sku.category,
            Sku.sub_category,
            Sku.material_code,
            Sku.material_description,
        ],
        date_fields={"created_at": Sku.created_at, "updated_at": Sku.updated_at},
        sort_fields={
            "id": Sku.id,
            "category": Sku.category,
            "material_code": Sku.material_code,
            "created_at": Sku.created_at,
            "updated_at": Sku.updated_at,
        },
        default_sort_field="id",
    )
    return build_paginated_response(
        query=query, page=params.page, per_page=params.per_page, mapper=map_sku
    )


@router.get("/skus/{sku_uuid}", response_model=SkuResponse)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_sku(
    request: Request,
    sku_uuid: uuid.UUID,
    db: Session = Depends(get_db),
):
    sku = db.query(Sku).filter(Sku.uuid == sku_uuid).first()
    if sku is None:
        raise HTTPException(status_code=404, detail="Sku not found")
    return map_sku(sku)


@router.get("/skus/csv/template")
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def download_skus_csv_template(
    request: Request,
    db: Session = Depends(get_db),
):
    skus = db.query(Sku).order_by(Sku.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "category",
            "sub_category",
            "category_code",
            "category_description",
            "material_code",
            "material_description",
        ]
    )
    for sku in skus:
        writer.writerow(
            [
                sku.category,
                sku.sub_category,
                sku.category_code,
                sku.category_description,
                sku.material_code,
                sku.material_description,
            ]
        )
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="skus_template.csv"'},
    )


@router.post("/skus/csv/upload")
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def upload_skus_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    rows = read_csv_upload(
        file=file,
        required_headers={
            "category",
            "sub_category",
            "category_code",
            "category_description",
            "material_code",
            "material_description",
        },
    )

    CategoryCompositeKey = tuple[str, str, str, str]
    category_rows_by_key: dict[CategoryCompositeKey, dict[str, object]] = {}
    product_rows: list[dict[str, object]] = []
    sku_rows: list[dict[str, object]] = []

    seen_material_codes: set[str] = set()
    skipped = 0
    errors: list[str] = []

    for row_number, row in enumerate(rows, start=2):
        category = (row.get("category") or "").strip()
        sub_category = (row.get("sub_category") or "").strip()
        category_code = (row.get("category_code") or "").strip()
        category_description = (row.get("category_description") or "").strip()
        material_code = (row.get("material_code") or "").strip()
        material_description = (row.get("material_description") or "").strip()

        if not all(
            [
                category,
                sub_category,
                category_code,
                category_description,
                material_code,
                material_description,
            ]
        ):
            skipped += 1
            errors.append(f"Row {row_number}: required field is missing")
            continue

        if material_code in seen_material_codes:
            skipped += 1
            errors.append(
                f"Row {row_number}: duplicate material_code in same upload ({material_code})"
            )
            continue

        # ProductCategory.name: category sub_category category_description (category_code)
        composite_key: CategoryCompositeKey = (
            category,
            sub_category,
            category_code,
            category_description,
        )
        base_name = " ".join([category, sub_category, category_description]).strip()
        category_unique_name = (
            f"{base_name} ({category_code})" if base_name else f"({category_code})"
        )
        if len(category_unique_name) > 128:
            skipped += 1
            errors.append(
                f"Row {row_number}: combined category name exceeds 128 characters "
                f"(category + sub_category + category_description + category_code)"
            )
            continue

        if composite_key not in category_rows_by_key:
            category_rows_by_key[composite_key] = {
                "uuid": uuid.uuid4(),
                "name": category_unique_name,
                "category_type": category,
                "sub_category_type": sub_category,
                "category_code": category_code,
                "category_description": category_description,
                "is_active": True,
            }

        seen_material_codes.add(material_code)

        product_rows.append(
            {
                "uuid": uuid.uuid4(),
                "category": category,
                "sub_category": sub_category,
                "category_code": category_code,
                "category_description": category_description,
                "material_code": material_code,
                "material_description": material_description,
                "is_active": True,
            }
        )

        sku_rows.append(
            {
                "uuid": uuid.uuid4(),
                "category": category,
                "sub_category": sub_category,
                "category_code": category_code,
                "category_description": category_description,
                "material_code": material_code,
                "material_description": material_description,
                "source_data": row,
                "is_active": True,
            }
        )

    if not product_rows:
        return {
            "success": True,
            "created_categories": 0,
            "created_products": 0,
            "created_skus": 0,
            "skipped": skipped,
            "errors": errors,
        }

    try:
        category_rows = list(category_rows_by_key.values())

        category_stmt = (
            insert(ProductCategory)
            .values(category_rows)
            .on_conflict_do_nothing(
                index_elements=[
                    ProductCategory.category_type,
                    ProductCategory.sub_category_type,
                    ProductCategory.category_code,
                    ProductCategory.category_description,
                ],
            )
            .returning(
                ProductCategory.id,
                ProductCategory.category_type,
                ProductCategory.sub_category_type,
                ProductCategory.category_code,
                ProductCategory.category_description,
            )
        )

        inserted_categories = db.execute(category_stmt).all()

        composite_keys = list(category_rows_by_key.keys())

        existing_categories = (
            db.query(
                ProductCategory.id,
                ProductCategory.category_type,
                ProductCategory.sub_category_type,
                ProductCategory.category_code,
                ProductCategory.category_description,
            )
            .filter(
                tuple_(
                    ProductCategory.category_type,
                    ProductCategory.sub_category_type,
                    ProductCategory.category_code,
                    ProductCategory.category_description,
                ).in_(composite_keys)
            )
            .all()
        )

        category_map = {
            (ct, sct, cc, cd): cid for cid, ct, sct, cc, cd in existing_categories
        }

        missing_keys = set(composite_keys) - set(category_map.keys())

        if missing_keys:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Product category rows missing for keys: {sorted(missing_keys)}",
            )

        final_product_rows = [
            {
                "uuid": row["uuid"],
                "product_category_id": category_map[
                    (
                        str(row["category"]),
                        str(row["sub_category"]),
                        str(row["category_code"]),
                        str(row["category_description"]),
                    )
                ],
                "material_code": row["material_code"],
                "material_description": row["material_description"],
                "is_active": True,
            }
            for row in product_rows
        ]

        product_stmt = (
            insert(Product)
            .values(final_product_rows)
            .on_conflict_do_nothing(
                index_elements=[Product.material_code],
            )
            .returning(Product.id)
        )

        inserted_products = db.execute(product_stmt).all()

        sku_stmt = (
            insert(Sku)
            .values(sku_rows)
            .on_conflict_do_nothing(
                index_elements=[Sku.material_code],
            )
            .returning(Sku.id)
        )

        inserted_skus = db.execute(sku_stmt).all()

        db.commit()

        return {
            "success": True,
            "created_categories": len(inserted_categories),
            "created_products": len(inserted_products),
            "created_skus": len(inserted_skus),
            "skipped": skipped,
            "errors": errors,
        }

    except IntegrityError as ex:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"CSV upload failed due to constraint conflict: {str(ex.orig)}",
        )
