"""Add Paddle fields to subscriptions table.

Revision ID: 005
Revises: 004
Create Date: 2026-04-12
"""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("subscriptions", sa.Column("paddle_subscription_id", sa.String(100), nullable=True))
    op.add_column("subscriptions", sa.Column("paddle_customer_id", sa.String(100), nullable=True))
    op.add_column("subscriptions", sa.Column("paddle_transaction_id", sa.String(100), nullable=True))


def downgrade():
    op.drop_column("subscriptions", "paddle_transaction_id")
    op.drop_column("subscriptions", "paddle_customer_id")
    op.drop_column("subscriptions", "paddle_subscription_id")
