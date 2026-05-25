"""user sessions for revocable device logins

Revision ID: b8e4f1a92c0d
Revises: 2f0d56523fea
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b8e4f1a92c0d"
down_revision: Union[str, Sequence[str], None] = "2f0d56523fea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_sessions_jti"), "user_sessions", ["jti"], unique=True)
    op.create_index(
        "ix_user_sessions_device_active", "user_sessions", ["device_id", "is_active"], unique=False
    )
    op.create_index(
        "ix_user_sessions_user_active", "user_sessions", ["user_id", "is_active"], unique=False
    )
    op.create_index(op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_user_sessions_device_id"), "user_sessions", ["device_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_sessions_device_id"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_active", table_name="user_sessions")
    op.drop_index("ix_user_sessions_device_active", table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_jti"), table_name="user_sessions")
    op.drop_table("user_sessions")
