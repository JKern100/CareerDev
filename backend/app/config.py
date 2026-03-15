from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CareerDev"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite+aiosqlite:///./careerdev.db"
    DATABASE_URL_SYNC: str = "sqlite:///./careerdev.db"

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # Allowed CORS origins (comma-separated for multiple)
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://career-dev.vercel.app"

    # Password reset
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@careerdev.app"
    FRONTEND_URL: str = "http://localhost:3000"

    # LLM / RAG settings
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    @property
    def async_database_url(self) -> str:
        """Convert standard DATABASE_URL to async version for deployment platforms."""
        url = self.DATABASE_URL
        # Render provides postgres:// or postgresql://, convert to postgresql+asyncpg://
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        env_file = ".env"


settings = Settings()
