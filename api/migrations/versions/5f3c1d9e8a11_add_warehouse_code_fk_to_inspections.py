"""add warehouse_code fk to inspections

Revision ID: 5f3c1d9e8a11
Revises: 1423fee6d824
Create Date: 2026-04-24 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5f3c1d9e8a11"
down_revision: Union[str, Sequence[str], None] = "1423fee6d824"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inspections",
        sa.Column("warehouse_code", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_inspections_warehouse_code"),
        "inspections",
        ["warehouse_code"],
        unique=False,
    )
    op.create_index(
        "ix_inspections_warehouse_code_active",
        "inspections",
        ["warehouse_code", "is_active"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_inspections_warehouse_code_warehouses",
        "inspections",
        "warehouses",
        ["warehouse_code"],
        ["warehouse_code"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_inspections_warehouse_code_warehouses",
        "inspections",
        type_="foreignkey",
    )
    op.drop_index("ix_inspections_warehouse_code_active", table_name="inspections")
    op.drop_index(op.f("ix_inspections_warehouse_code"), table_name="inspections")
    op.drop_column("inspections", "warehouse_code")
