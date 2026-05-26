"""Add newsletter_issues and newsletter_subscribers tables.

Revision ID: 009
Revises: 008
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "newsletter_issues",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False, unique=True, index=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("teaser_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("body_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft", index=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("confirm_token", sa.String(64), nullable=True, unique=True, index=True),
        sa.Column("confirm_token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("unsub_token", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("source", sa.String(40), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("unsubscribed_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("newsletter_subscribers")
    op.drop_table("newsletter_issues")
