"""Entrypoint that reads PORT from the environment and starts uvicorn."""
import os
import sys
import traceback
import uvicorn

if __name__ == "__main__":
    # Validate the app can import before starting uvicorn
    try:
        from app.config import settings  # noqa: F401 — catches SECRET_KEY guard early
        from app.main import app  # noqa: F401
    except Exception:
        traceback.print_exc()
        sys.exit(1)

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
