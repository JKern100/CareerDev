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

    # Newsletter
    NEWSLETTER_FROM: str = ""  # falls back to EMAIL_FROM if empty
    NEWSLETTER_REPLY_TO: str = ""  # where newsletter/broadcast replies go (e.g. a Gmail you read)
    NEWSLETTER_SENDER_ADDRESS: str = ""  # CAN-SPAM physical address; logs warning if empty

    # Resend webhooks (for open/click/bounce tracking)
    RESEND_WEBHOOK_SECRET: str = ""  # Signing secret from Resend dashboard. If empty, webhook returns 503.

    # LLM / RAG settings
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # LemonSqueezy (legacy — kept for existing data)
    LEMONSQUEEZY_API_KEY: str = ""
    LEMONSQUEEZY_STORE_ID: str = ""
    LEMONSQUEEZY_WEBHOOK_SECRET: str = ""
    LEMONSQUEEZY_VARIANT_PRO: str = ""
    LEMONSQUEEZY_VARIANT_PREMIUM: str = ""
    LEMONSQUEEZY_VARIANT_MONTHLY: str = ""

    # Paddle
    PADDLE_API_KEY: str = ""
    PADDLE_WEBHOOK_SECRET: str = ""
    PADDLE_PRICE_PRO: str = ""  # pri_xxx — $9/month subscription
    PADDLE_ENVIRONMENT: str = "production"  # "sandbox" or "production"

    @property
    def async_database_url(self) -> str:
        """Convert standard DATABASE_URL to async version for deployment platforms."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_database_url(self) -> str:
        """Return a sync DB URL suitable for Alembic / synchronous engines."""
        if self.DATABASE_URL_SYNC != "sqlite:///./careerdev.db":
            return self.DATABASE_URL_SYNC
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        for prefix in ("postgresql+asyncpg://", "sqlite+aiosqlite://"):
            sync = prefix.split("+")[0] + "://"
            if url.startswith(prefix):
                return url.replace(prefix, sync, 1)
        return url

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Startup diagnostics — use print() so output appears in Railway deploy logs
# (Python logging may not be configured yet at import time)
print(f"[config] RESEND_API_KEY configured: {bool(settings.RESEND_API_KEY)} (len={len(settings.RESEND_API_KEY)})", flush=True)
print(f"[config] EMAIL_FROM: {settings.EMAIL_FROM}", flush=True)
print(f"[config] FRONTEND_URL: {settings.FRONTEND_URL}", flush=True)
print(f"[config] DATABASE_URL starts with: {settings.DATABASE_URL[:20]}...", flush=True)

if not settings.DEBUG and settings.SECRET_KEY == "change-me-in-production":
    print(
        "[config] CRITICAL: SECRET_KEY is still the default! "
        "Set a secure SECRET_KEY environment variable.",
        flush=True,
    )
