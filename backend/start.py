"""Entrypoint that reads PORT from the environment and starts uvicorn."""
import os
import sys
import traceback
import uvicorn

if __name__ == "__main__":
    # Validate the app can import before starting uvicorn
    try:
        print("[boot] Importing config...", flush=True)
        from app.config import settings  # noqa: F401 — catches SECRET_KEY guard early
        print(f"[boot] DATABASE_URL scheme: {settings.DATABASE_URL.split('://')[0] if '://' in settings.DATABASE_URL else 'unknown'}", flush=True)
        print(f"[boot] async_database_url scheme: {settings.async_database_url.split('://')[0] if '://' in settings.async_database_url else 'unknown'}", flush=True)
        print("[boot] Importing app...", flush=True)
        from app.main import app  # noqa: F401
        print("[boot] Import OK", flush=True)
    except Exception:
        print("[boot] FATAL: Import failed!", file=sys.stderr, flush=True)
        traceback.print_exc()
        sys.exit(1)

    port = int(os.environ.get("PORT", 8000))
    print(f"[boot] Starting uvicorn on port {port}...", flush=True)
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
