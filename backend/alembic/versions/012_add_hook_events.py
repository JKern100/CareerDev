"""Add hook_events table for the anonymous 60-second hook funnel.

Revision ID: 012
Revises: 011
Create Date: 2026-06-17
"""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "hook_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event", sa.String(length=20), nullable=False),
        sa.Column("region", sa.String(length=50), nullable=True),
        sa.Column("top_pathway", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hook_events_event", "hook_events", ["event"])
    op.create_index("ix_hook_events_created_at", "hook_events", ["created_at"])


def downgrade():
    op.drop_index("ix_hook_events_created_at", table_name="hook_events")
    op.drop_index("ix_hook_events_event", table_name="hook_events")
    op.drop_table("hook_events")
