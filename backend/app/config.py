from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CareerDev"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://careerdev:careerdev@localhost:5432/careerdev"
    DATABASE_URL_SYNC: str = "postgresql://careerdev:careerdev@localhost:5432/careerdev"

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # LLM / RAG settings (placeholder)
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    class Config:
        env_file = ".env"


settings = Settings()
