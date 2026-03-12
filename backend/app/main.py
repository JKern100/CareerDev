from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, async_session
from app.models.questionnaire import Question
from app.services.routing import get_question_bank


async def _seed_questions():
    """Seed the questions table from the CSV question bank."""
    async with async_session() as session:
        result = await session.execute(select(Question.id).limit(1))
        if result.scalar_one_or_none() is not None:
            return  # Already seeded

        for q in get_question_bank():
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
        await session.commit()


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

    await _seed_questions()
    yield


from app.api import auth, questionnaire, analysis, privacy

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Career-Advice App for Flight Crew — UAE MVP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(questionnaire.router)
app.include_router(analysis.router)
app.include_router(privacy.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
