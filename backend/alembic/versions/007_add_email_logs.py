"""Add email_logs table.

Revision ID: 007
Revises: 006
Create Date: 2026-04-22
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("to_email", sa.String(255), nullable=False, index=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("email_type", sa.String(50), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("resend_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("email_logs")
