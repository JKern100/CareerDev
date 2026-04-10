from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CareerDev"
    DEBUG: bool = False
    SQL_ECHO: bool = False

    DATABASE_URL: str = "sqlite+aiosqlite:///./careerdev.db"
    DATABASE_URL_SYNC: str = "sqlite:///./careerdev.db"

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # Allowed CORS origins (comma-separated for multiple)
    ALLOWED_ORIGINS: str = "https://career-dev.vercel.app"

    # Password reset
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@crewtransition.com"
    FRONTEND_URL: str = "http://localhost:3000"

    # LLM / RAG settings
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # LemonSqueezy
    LEMONSQUEEZY_API_KEY: str = ""
    LEMONSQUEEZY_STORE_ID: str = ""
    LEMONSQUEEZY_WEBHOOK_SECRET: str = ""
    # Product variant IDs for each tier (set in LemonSqueezy dashboard)
    LEMONSQUEEZY_VARIANT_PRO: str = ""       # one-time ~$29
    LEMONSQUEEZY_VARIANT_PREMIUM: str = ""   # one-time ~$49
    LEMONSQUEEZY_VARIANT_MONTHLY: str = ""   # subscription ~$15/mo

    @property
    def async_database_url(self) -> str:
        """Convert standard DATABASE_URL to async version for deployment platforms."""
        url = self.DATABASE_URL
        # Railway/Render provide postgres:// or postgresql://, convert to postgresql+asyncpg://
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

import logging as _logging
_logger = _logging.getLogger(__name__)
_logger.info("RESEND_API_KEY configured: %s", bool(settings.RESEND_API_KEY))
_logger.info("FRONTEND_URL: %s", settings.FRONTEND_URL)

if not settings.DEBUG and settings.SECRET_KEY == "change-me-in-production":
    import logging as _logging
    _logging.getLogger(__name__).critical(
        "SECRET_KEY is still the default! Set a secure SECRET_KEY environment variable. "
        "Using the default in production is a serious security risk."
    )
