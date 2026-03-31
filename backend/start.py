"""Entrypoint that reads PORT from the environment and starts uvicorn."""
import os
import sys
import uvicorn

if __name__ == "__main__":
    # Validate the app can import before starting uvicorn
    try:
        from app.main import app  # noqa: F401
    except Exception as e:
        print(f"FATAL: App failed to start: {e}", file=sys.stderr)
        sys.exit(1)

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
