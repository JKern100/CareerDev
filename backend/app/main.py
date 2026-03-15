import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text, inspect

from app.config import settings
from app.database import engine, Base, async_session
from app.models.questionnaire import Question
from app.models.pathway import Pathway
from app.services.routing import get_question_bank
from app.services.scoring import load_pathways

logger = logging.getLogger(__name__)


def _add_missing_columns(conn):
    """Add any columns that exist in models but not in the DB tables.

    create_all only creates new tables — it won't ALTER existing ones.
    This function inspects each table and adds missing columns with defaults.
    """
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # Map SQLAlchemy types to SQL type strings for PostgreSQL/SQLite
    type_map = {
        "FLOAT": "FLOAT DEFAULT 0.0",
        "VARCHAR": "VARCHAR(200) DEFAULT ''",
        "TEXT": "TEXT DEFAULT ''",
        "INTEGER": "INTEGER DEFAULT 0",
        "JSON": "JSON",
        "BOOLEAN": "BOOLEAN DEFAULT false",
        "DATETIME": "TIMESTAMP",
        "UUID": "UUID",
    }

    for table in Base.metadata.tables.values():
        if table.name not in existing_tables:
            continue

        existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing_columns:
                col_type = type(column.type).__name__.upper()
                sql_type = type_map.get(col_type, "TEXT")
                logger.info(f"Adding missing column {table.name}.{column.name} ({sql_type})")
                try:
                    conn.execute(text(
                        f'ALTER TABLE {table.name} ADD COLUMN "{column.name}" {sql_type}'
                    ))
                except Exception as e:
                    logger.warning(f"Could not add column {table.name}.{column.name}: {e}")


async def _seed_questions():
    """Seed the questions table from the CSV question bank.

    Additive: inserts any questions from the CSV that are not yet in the DB.
    """
    async with async_session() as session:
        result = await session.execute(select(Question.id))
        existing_ids = {row[0] for row in result.all()}

        added = 0
        for q in get_question_bank():
            if q.question_id not in existing_ids:
                session.add(Question(
                    id=q.question_id,
                    module=q.module,
                    prompt=q.prompt,
                    question_type=q.question_type,
                    required=q.required,
                    options_json=q.options_json,
                    min_val=q.min_val,
                    max_val=q.max_val,
                    route_if_json=q.route_if_json,
                    tags_json=q.tags_json,
                ))
                added += 1
        if added:
            await session.commit()
            logger.info("Seeded %d new questions (total in CSV: %d)", added, len(get_question_bank()))


async def _seed_pathways():
    """Seed the pathways table from pathways.json.

    Additive + update: inserts missing pathways and updates existing ones
    so that JSON changes (names, weights, credentials, etc.) are reflected.
    """
    async with async_session() as session:
        result = await session.execute(select(Pathway))
        existing = {p.id: p for p in result.scalars().all()}

        added, updated = 0, 0
        for pw in load_pathways():
            if pw["id"] in existing:
                p = existing[pw["id"]]
                p.name = pw["name"]
                p.description = pw["description"]
                p.prerequisites = pw.get("prerequisites")
                p.typical_roles = pw.get("typical_roles", [])
                p.salary_band_refs = pw.get("salary_band_refs")
                p.salary_global_note = pw.get("salary_global_note")
                p.recommended_credentials = pw.get("recommended_credentials")
                p.weight_interest = pw.get("weight_interest", 0.25)
                p.weight_skill = pw.get("weight_skill", 0.25)
                p.weight_environment = pw.get("weight_environment", 0.10)
                p.weight_feasibility = pw.get("weight_feasibility", 0.20)
                p.weight_compensation = pw.get("weight_compensation", 0.15)
                p.weight_risk = pw.get("weight_risk", 0.05)
                updated += 1
            else:
                session.add(Pathway(
                    id=pw["id"],
                    name=pw["name"],
                    description=pw["description"],
                    prerequisites=pw.get("prerequisites"),
                    typical_roles=pw.get("typical_roles", []),
                    salary_band_refs=pw.get("salary_band_refs"),
                    salary_global_note=pw.get("salary_global_note"),
                    recommended_credentials=pw.get("recommended_credentials"),
                    weight_interest=pw.get("weight_interest", 0.25),
                    weight_skill=pw.get("weight_skill", 0.25),
                    weight_environment=pw.get("weight_environment", 0.10),
                    weight_feasibility=pw.get("weight_feasibility", 0.20),
                    weight_compensation=pw.get("weight_compensation", 0.15),
                    weight_risk=pw.get("weight_risk", 0.05),
                ))
                added += 1
        await session.commit()
        if added or updated:
            logger.info("Pathways: %d added, %d updated (total in JSON: %d)", added, updated, len(load_pathways()))


async def _repair_question_data():
    """Fix any questions where tags_json contains a dict instead of a list.

    This can happen if route_if_json data was accidentally stored in tags_json.
    Re-seeds affected rows from the CSV question bank.
    """
    bank = {q.question_id: q for q in get_question_bank()}
    async with async_session() as session:
        result = await session.execute(select(Question))
        questions = result.scalars().all()
        repaired = 0
        for q in questions:
            if isinstance(q.tags_json, dict) or (q.id in bank and q.tags_json != bank[q.id].tags_json):
                csv_q = bank.get(q.id)
                if csv_q:
                    q.tags_json = csv_q.tags_json
                    q.route_if_json = csv_q.route_if_json
                    repaired += 1
        if repaired:
            await session.commit()
            logger.info("Repaired %d questions with incorrect tags_json data", repaired)


async def _backfill_existing_users_verified():
    """Mark pre-existing users as email_verified so they aren't locked out."""
    from app.models.user import User
    async with async_session() as session:
        result = await session.execute(
            select(User).where(
                User.email_verified == False,  # noqa: E712
                User.has_logged_in == False,  # noqa: E712
                User.created_at < datetime.utcnow(),
            )
        )
        users = result.scalars().all()
        updated = 0
        for user in users:
            # If the user has any answers, they clearly existed before verification was added
            if len(user.answers) > 0 or user.questionnaire_completed:
                user.email_verified = True
                user.has_logged_in = True
                updated += 1
        if updated:
            await session.commit()
            logger.info("Backfilled %d existing users as email_verified", updated)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so Base.metadata knows about them
    import app.models.user  # noqa: F401
    import app.models.questionnaire  # noqa: F401
    import app.models.report  # noqa: F401
    import app.models.pathway  # noqa: F401
    import app.models.advisor  # noqa: F401
    import app.models.audit  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)

    await _seed_pathways()
    await _seed_questions()
    await _repair_question_data()
    await _backfill_existing_users_verified()
    yield


from app.api import auth, questionnaire, analysis, privacy, admin, scheduling, results

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Career-Advice App for Flight Crew",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(questionnaire.router)
app.include_router(analysis.router)
app.include_router(privacy.router)
app.include_router(admin.router)
app.include_router(scheduling.router)
app.include_router(results.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
