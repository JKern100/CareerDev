"""Add email_events table for Resend webhook tracking.

Revision ID: 010
Revises: 009
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("resend_id", sa.String(100), nullable=False, index=True),
        sa.Column("to_email", sa.String(320), nullable=False, index=True),
        sa.Column("event_type", sa.String(40), nullable=False, index=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("event_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("raw_json", sa.Text(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_email_events_resend_type_time",
        "email_events",
        ["resend_id", "event_type", "event_at"],
    )


def downgrade():
    op.drop_constraint("uq_email_events_resend_type_time", "email_events", type_="unique")
    op.drop_table("email_events")
