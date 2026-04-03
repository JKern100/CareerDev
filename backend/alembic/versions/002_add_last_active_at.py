"""Add last_active_at to users table.

Revision ID: 002
Revises: 001
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_active_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_active_at")
