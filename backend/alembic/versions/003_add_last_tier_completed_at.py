"""Add last_tier_completed_at to users table.

Revision ID: 003
Revises: 002
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_tier_completed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_tier_completed_at")
