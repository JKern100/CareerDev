"""Add previous_login_at to users for the admin "since you were last here" digest.

Revision ID: 011
Revises: 010
Create Date: 2026-06-13
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("previous_login_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "previous_login_at")
