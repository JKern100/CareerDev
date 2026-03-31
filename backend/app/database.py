from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

_engine_kwargs = {"echo": settings.SQL_ECHO}
# Add connection timeout for PostgreSQL to avoid hanging on startup
if "postgresql" in settings.async_database_url or "postgres" in settings.async_database_url:
    _engine_kwargs["connect_args"] = {"timeout": 30}

engine = create_async_engine(settings.async_database_url, **_engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
