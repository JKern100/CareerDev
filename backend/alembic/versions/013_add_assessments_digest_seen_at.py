"""Add assessments_digest_seen_at to users.

Tracks, per admin, the last time they were shown the 60-second assessment
run count, so the digest reports the full baseline once then only newer runs.

Revision ID: 013
Revises: 012
Create Date: 2026-06-17
"""

from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("assessments_digest_seen_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "assessments_digest_seen_at")
