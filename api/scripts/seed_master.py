import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from mod.model import ProductCategory, Role, User
from utils.db import SessionLocal
from utils.env import get_env


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
        "warehouses",
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

    for name in categories:
        category = ProductCategory(
            uuid=uuid.uuid4(),
            name=name,
            is_active=True,
        )

        db.add(category)

    db.commit()


def seed_users(db: Session):
    role_map = {r.role: r.id for r in db.query(Role).all()}

    users = [
        {
            "name": "Arun Dev Kumar",
            "email": "arun@company.com",
            "mobile": "9000000001",
            "designation": "Super Administrator",
            "role": "superadmin",
        },
        {
            "name": "Ramsharan Yadav",
            "email": "ramsharan@company.com",
            "mobile": "9000000002",
            "designation": "Field Operator",
            "role": "operator",
        },
        {
            "name": "Devesh Verma",
            "email": "devesh@company.com",
            "mobile": "9000000003",
            "designation": "Operations Manager",
            "role": "manager",
        },
    ]

    for u in users:
        user = User(
            uuid=uuid.uuid4(),
            name=u["name"],
            email=u["email"].lower(),
            mobile_number=u["mobile"],
            password="change_me",
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
        seed_product_categories(db)
        seed_users(db)

        print("Seed completed successfully")

    finally:
        db.close()


if __name__ == "__main__":
    if get_env("APP_ENV") != "dev":
        raise Exception("Seed not allowed in production")
    main()
