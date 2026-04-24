import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from mod.model import ProductCategory, Role, User
from utils.db import SessionLocal
from utils.env import get_env
from utils.password import hash_password


def truncate_all(db: Session):
    tables = [
        "logs",
        "inspection_images",
        "inspection_inputs",
        "inspections",
        "checklist_fields",
        "checklist_groups",
        "checklists",
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


def seed_product_categories(db: Session):
    categories = [
        "Refrigerator",
        "Washing Machine",
        "Microwave",
        "Dishwasher",
        "Air Conditioner",
    ]

    sub_category_type = "General"
    for name in categories:
        category_code = "SEED_" + name.upper().replace(" ", "_")
        category_description = ""
        base_name = f"{name} {sub_category_type} {category_description}".strip()
        display_name = (
            f"{base_name} ({category_code})"
            if base_name
            else f"({category_code})"
        )
        category = ProductCategory(
            uuid=uuid.uuid4(),
            name=display_name,
            category_type=name,
            sub_category_type=sub_category_type,
            category_code=category_code,
            category_description=category_description,
            is_active=True,
        )

        db.add(category)

    db.commit()


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

        print("Seed completed successfully")

    finally:
        db.close()


if __name__ == "__main__":
    if get_env("APP_ENV") != "dev":
        raise Exception("Seed not allowed in production")
    main()
