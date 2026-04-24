import csv
import uuid
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from mod.model import (
    Checklist,
    ChecklistFieldType,
    ChecklistGroup,
    ChecklistPhotoUploadRule,
    Role,
    User,
)
from utils.db import SessionLocal
from utils.env import get_env
from utils.password import hash_password

API_ROOT = Path(__file__).resolve().parents[1]
CHECKLIST_CSV = API_ROOT / "sample" / "checklist.csv"

CHECKLIST_CSV_HEADERS = {
    "Sno",
    "Group",
    "Section",
    "Checklist Item",
    "Response (Yes/No)",
    "Remarks",
    "Upload Photo ? (Y/N)",
    "Required Upload Files",
}


def truncate_all(db: Session):
    tables = [
        "logs",
        "inspection_images",
        "inspection_inputs",
        "inspections",
        "checklists",
        "product_units",
        "products",
        "product_categories",
        "skus",
        "warehouses",
        "plants",
        "devices",
        "users",
        "roles",
    ]

    sql = f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;"
    db.execute(text(sql))
    db.commit()

    print("All tables truncated")


def seed_roles(db: Session):
    roles = [
        ("superadmin", "Super administrator"),
        ("manager", "Manager user"),
        ("operator", "Operator user"),
    ]

    for role_name, desc in roles:
        role = Role(
            uuid=uuid.uuid4(),
            role=role_name,
            description=desc,
            is_active=True,
        )

        db.add(role)

    db.commit()


def seed_product_categories(db: Session) -> None:
    """No-op: add ProductCategory rows here when product seeding is introduced."""
    return


def parse_checklist_group(cell: str) -> ChecklistGroup:
    c = (cell or "").strip().lower()
    mapping: dict[str, ChecklistGroup] = {
        "outer packaging": ChecklistGroup.outer_packaging,
        "inner packaging": ChecklistGroup.inner_packaging,
        "product": ChecklistGroup.product,
    }
    if c not in mapping:
        raise ValueError(
            f"Unknown checklist Group (expected Outer/Inner/Product): {cell!r}"
        )
    return mapping[c]


def parse_field_type(response_cell: str) -> ChecklistFieldType:
    c = (response_cell or "").strip().lower()
    if "yes" in c and "no" in c:
        return ChecklistFieldType.yes_no
    if "date" in c:
        return ChecklistFieldType.date
    if "dropdown" in c:
        return ChecklistFieldType.dropdown
    return ChecklistFieldType.free_text


def parse_photo_upload_rule(cell: str) -> ChecklistPhotoUploadRule:
    c = (cell or "").strip().lower()
    if not c:
        return ChecklistPhotoUploadRule.none
    if "response" in c and "no" in c:
        return ChecklistPhotoUploadRule.when_no
    if c.startswith("y"):
        return ChecklistPhotoUploadRule.always
    if c.startswith("n"):
        return ChecklistPhotoUploadRule.none
    return ChecklistPhotoUploadRule.optional


def allows_remarks(remarks_cell: str) -> bool:
    return "free text" in (remarks_cell or "").strip().lower()


def min_upload_files(cell: str) -> int:
    raw = (cell or "").strip()
    if not raw:
        return 0
    try:
        return max(0, int(raw))
    except ValueError:
        return 0


def seed_checklist_from_csv(db: Session) -> None:
    if not CHECKLIST_CSV.is_file():
        raise FileNotFoundError(f"Missing checklist CSV: {CHECKLIST_CSV}")

    with CHECKLIST_CSV.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"Checklist CSV has no header row: {CHECKLIST_CSV}")
        missing = CHECKLIST_CSV_HEADERS.difference(
            {h.strip() for h in reader.fieldnames if h}
        )
        if missing:
            raise ValueError(
                f"Checklist CSV missing columns {sorted(missing)}: {CHECKLIST_CSV}"
            )
        rows = list(reader)

    if not rows:
        raise ValueError(f"Checklist CSV is empty: {CHECKLIST_CSV}")

    seeded = 0

    for row in rows:
        sno_raw = (row.get("Sno") or "").strip()
        if not sno_raw:
            continue
        sort_order = int(sno_raw)
        seeded += 1
        group = parse_checklist_group(row.get("Group") or "")
        section = (row.get("Section") or "").strip()
        item_text = (row.get("Checklist Item") or "").strip()
        response_col = row.get("Response (Yes/No)") or ""
        remarks_col = row.get("Remarks") or ""
        photo_col = row.get("Upload Photo ? (Y/N)") or ""
        upload_files_col = row.get("Required Upload Files") or ""

        item = Checklist(
            uuid=uuid.uuid4(),
            sort_order=sort_order,
            group_name=group,
            section=section,
            item_text=item_text,
            field_type=parse_field_type(response_col),
            dropdown_options=None,
            allows_remarks=allows_remarks(remarks_col),
            photo_upload_rule=parse_photo_upload_rule(photo_col),
            min_upload_files=min_upload_files(upload_files_col),
            is_active=True,
        )
        db.add(item)

    db.commit()
    print(f"Seeded {seeded} checklist rows from {CHECKLIST_CSV.name}")


def seed_users(db: Session):
    role_map = {r.role: r.id for r in db.query(Role).all()}

    users = [
        {
            "name": "Arun Dev Kumar",
            "email": "arun@whirlpool.com",
            "mobile": "9000000001",
            "designation": "Super Administrator",
            "role": "superadmin",
        },
        {
            "name": "Ramsharan Yadav",
            "email": "ramsharan@whirlpool.com",
            "mobile": "9000000002",
            "designation": "Field Operator",
            "role": "operator",
        },
        {
            "name": "Devesh Verma",
            "email": "devesh@whirlpool.com",
            "mobile": "9000000003",
            "designation": "Operations Manager",
            "role": "manager",
        },
    ]

    default_password = hash_password("admin@cmp")

    for u in users:
        user = User(
            uuid=uuid.uuid4(),
            name=u["name"],
            email=u["email"].lower(),
            mobile_number=u["mobile"],
            password=default_password,
            designation=u["designation"],
            role_id=role_map[u["role"]],
            is_active=True,
        )

        db.add(user)

    db.commit()


def main():
    db = SessionLocal()

    try:
        truncate_all(db)

        seed_roles(db)
        seed_users(db)
        seed_product_categories(db)
        seed_checklist_from_csv(db)

        print("Seed completed successfully")

    finally:
        db.close()


if __name__ == "__main__":
    if get_env("APP_ENV") != "dev":
        raise Exception("Seed not allowed in production")
    main()
