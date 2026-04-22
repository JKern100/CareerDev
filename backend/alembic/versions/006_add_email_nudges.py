"""Add email nudge fields to users table.

Revision ID: 006
Revises: 005
Create Date: 2026-04-22
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("email_nudges_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("unsubscribe_token", sa.String(64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("stage1_email_sent_at", sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint("uq_users_unsubscribe_token", "users", ["unsubscribe_token"])
    op.create_index("ix_users_unsubscribe_token", "users", ["unsubscribe_token"])


def downgrade():
    op.drop_index("ix_users_unsubscribe_token", table_name="users")
    op.drop_constraint("uq_users_unsubscribe_token", "users", type_="unique")
    op.drop_column("users", "stage1_email_sent_at")
    op.drop_column("users", "unsubscribe_token")
    op.drop_column("users", "email_nudges_enabled")
