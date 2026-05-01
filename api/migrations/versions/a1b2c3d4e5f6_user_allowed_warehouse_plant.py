"""user allowed warehouses and plants association tables

Revision ID: a1b2c3d4e5f6
Revises: c3676aaec2dd
Create Date: 2026-05-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "c3676aaec2dd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_allowed_warehouses",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("warehouse_code", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["warehouse_code"],
            ["warehouses.warehouse_code"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "warehouse_code"),
    )
    op.create_index(
        "ix_user_allowed_warehouses_user_id",
        "user_allowed_warehouses",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "user_allowed_plants",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plant_code", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plant_code"], ["plants.plant_code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "plant_code"),
    )
    op.create_index(
        "ix_user_allowed_plants_user_id",
        "user_allowed_plants",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_allowed_plants_user_id", table_name="user_allowed_plants")
    op.drop_table("user_allowed_plants")
    op.drop_index(
        "ix_user_allowed_warehouses_user_id", table_name="user_allowed_warehouses"
    )
    op.drop_table("user_allowed_warehouses")
