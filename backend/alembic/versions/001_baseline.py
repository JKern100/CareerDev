"""baseline – create all tables

Revision ID: 001
Revises: None
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("auth_provider", sa.String(20), nullable=True),
        sa.Column("google_id", sa.String(255), unique=True, nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("country_pack", sa.String(10), nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=True),
        sa.Column("has_logged_in", sa.Boolean(), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("login_count", sa.Integer(), nullable=True),
        sa.Column("consent_processing", sa.Boolean(), nullable=True),
        sa.Column("consent_anonymized", sa.Boolean(), nullable=True),
        sa.Column("consent_advisor_access", sa.Boolean(), nullable=True),
        sa.Column("can_regenerate", sa.Boolean(), nullable=True),
        sa.Column("can_regenerate_summary", sa.Boolean(), nullable=True),
        sa.Column("questionnaire_completed", sa.Boolean(), nullable=True),
        sa.Column("current_module", sa.String(10), nullable=True),
        sa.Column("current_question_id", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # ── questions ──
    op.create_table(
        "questions",
        sa.Column("id", sa.String(10), primary_key=True),
        sa.Column("module", sa.String(50), nullable=False, index=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(30), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=True),
        sa.Column("options_json", sa.JSON(), nullable=True),
        sa.Column("min_val", sa.Integer(), nullable=True),
        sa.Column("max_val", sa.Integer(), nullable=True),
        sa.Column("route_if_json", sa.JSON(), nullable=True),
        sa.Column("tags_json", sa.JSON(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=True),
    )

    # ── pathways ──
    op.create_table(
        "pathways",
        sa.Column("id", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("prerequisites", sa.JSON(), nullable=True),
        sa.Column("typical_roles", sa.JSON(), nullable=True),
        sa.Column("salary_band_refs", sa.JSON(), nullable=True),
        sa.Column("salary_global_note", sa.Text(), nullable=True),
        sa.Column("recommended_credentials", sa.JSON(), nullable=True),
        sa.Column("country_pack", sa.String(10), nullable=True),
        sa.Column("weight_interest", sa.Float(), nullable=True),
        sa.Column("weight_skill", sa.Float(), nullable=True),
        sa.Column("weight_environment", sa.Float(), nullable=True),
        sa.Column("weight_feasibility", sa.Float(), nullable=True),
        sa.Column("weight_compensation", sa.Float(), nullable=True),
        sa.Column("weight_risk", sa.Float(), nullable=True),
    )

    # ── audit_events (no FK) ──
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False, index=True),
        sa.Column("object_id", sa.String(255), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("before_hash", sa.String(64), nullable=True),
        sa.Column("after_hash", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, index=True),
    )

    # ── promo_codes (no FK) ──
    op.create_table(
        "promo_codes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("discount_type", sa.String(20), nullable=False),
        sa.Column("discount_value", sa.Integer(), nullable=True),
        sa.Column("applies_to", sa.String(30), nullable=True),
        sa.Column("unlocks_plan", sa.String(30), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("max_uses_per_user", sa.Integer(), nullable=True),
        sa.Column("times_used", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=True),
    )

    # ── answers (FK → users, questions) ──
    op.create_table(
        "answers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("question_id", sa.String(10), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("evidence_refs", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_answers_user_question", "answers", ["user_id", "question_id"])

    # ── evidence (FK → users) ──
    op.create_table(
        "evidence",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("evidence_type", sa.String(50), nullable=False),
        sa.Column("storage_uri", sa.String(500), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("redaction_status", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ── pathway_scores (FK → users) ──
    op.create_table(
        "pathway_scores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("pathway_id", sa.String(10), nullable=False),
        sa.Column("raw_score", sa.Float(), nullable=True),
        sa.Column("confidence_factor", sa.Float(), nullable=True),
        sa.Column("adjusted_score", sa.Float(), nullable=True),
        sa.Column("interest_score", sa.Float(), nullable=True),
        sa.Column("skill_score", sa.Float(), nullable=True),
        sa.Column("environment_score", sa.Float(), nullable=True),
        sa.Column("feasibility_score", sa.Float(), nullable=True),
        sa.Column("compensation_score", sa.Float(), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("gate_flags", sa.JSON(), nullable=True),
        sa.Column("top_evidence_signals", sa.JSON(), nullable=True),
        sa.Column("risks_unknowns", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ── reports (FK → users) ──
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=False),
        sa.Column("citations_map", sa.JSON(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ── analysis_reports (FK → users) ──
    op.create_table(
        "analysis_reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("markdown_report", sa.Text(), nullable=False),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ── advisors (FK → users) ──
    op.create_table(
        "advisors",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("credentials", sa.Text(), nullable=True),
        sa.Column("specialties", sa.JSON(), nullable=True),
        sa.Column("languages", sa.JSON(), nullable=True),
        sa.Column("timezone", sa.String(50), nullable=True),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("jurisdiction_scope", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ── availability_slots (FK → advisors) ──
    op.create_table(
        "availability_slots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("advisor_id", sa.Uuid(), sa.ForeignKey("advisors.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False),
        sa.Column("end_time", sa.String(5), nullable=False),
    )

    # ── bookings (FK → users, advisors) ──
    op.create_table(
        "bookings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("advisor_id", sa.Uuid(), sa.ForeignKey("advisors.id"), nullable=False, index=True),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False),
        sa.Column("end_time", sa.String(5), nullable=False),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_bookings_advisor_date", "bookings", ["advisor_id", "date"])

    # ── activity_events (FK → users) ──
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("user_role", sa.String(20), nullable=False),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("detail", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, index=True),
    )

    # ── coach_messages (FK → users) ──
    op.create_table(
        "coach_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_coach_messages_user_created", "coach_messages", ["user_id", "created_at"])

    # ── coach_goals (FK → users) ──
    op.create_table(
        "coach_goals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("target_date", sa.String(20), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_coach_goals_user_created", "coach_goals", ["user_id", "created_at"])

    # ── action_steps (FK → users) ──
    op.create_table(
        "action_steps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("pathway_id", sa.String(10), nullable=True),
        sa.Column("pathway_name", sa.String(200), nullable=True),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("duration", sa.String(100), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_action_steps_user_pathway", "action_steps", ["user_id", "pathway_id"])

    # ── payments (FK → users) ──
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ls_order_id", sa.String(100), unique=True, nullable=False),
        sa.Column("ls_subscription_id", sa.String(100), nullable=True),
        sa.Column("ls_customer_id", sa.String(100), nullable=False),
        sa.Column("ls_variant_id", sa.String(100), nullable=False),
        sa.Column("plan", sa.String(30), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_payments_user", "payments", ["user_id"])

    # ── subscriptions (FK → users) ──
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), unique=True, nullable=False, index=True),
        sa.Column("plan", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("ls_subscription_id", sa.String(100), nullable=True),
        sa.Column("ls_customer_id", sa.String(100), nullable=True),
        sa.Column("activated_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # ── promo_redemptions (FK → promo_codes, users) ──
    op.create_table(
        "promo_redemptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("promo_code_id", sa.Uuid(), sa.ForeignKey("promo_codes.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_applied", sa.String(30), nullable=False),
        sa.Column("discount_applied", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_promo_redemptions_user", "promo_redemptions", ["user_id"])
    op.create_index("ix_promo_redemptions_code", "promo_redemptions", ["promo_code_id"])


def downgrade() -> None:
    # Drop in reverse order, respecting foreign-key dependencies.
    op.drop_table("promo_redemptions")
    op.drop_table("subscriptions")
    op.drop_table("payments")
    op.drop_table("action_steps")
    op.drop_table("coach_goals")
    op.drop_table("coach_messages")
    op.drop_table("activity_events")
    op.drop_table("bookings")
    op.drop_table("availability_slots")
    op.drop_table("advisors")
    op.drop_table("analysis_reports")
    op.drop_table("reports")
    op.drop_table("pathway_scores")
    op.drop_table("evidence")
    op.drop_table("answers")
    op.drop_table("promo_codes")
    op.drop_table("audit_events")
    op.drop_table("pathways")
    op.drop_table("questions")
    op.drop_table("users")
