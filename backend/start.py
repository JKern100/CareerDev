"""Entrypoint that reads PORT from the environment and starts uvicorn."""
import os
import subprocess
import sys
import traceback
import uvicorn


def _run_alembic():
    """Run pending Alembic migrations, bootstrapping if needed."""
    # First attempt: just upgrade
    r = subprocess.run(
        ["python", "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        print(f"[boot] Alembic OK: {r.stderr.strip() or 'up to date'}", flush=True)
        return

    # If upgrade failed, the DB was probably created via create_all (no
    # alembic_version table).  Stamp to 005 (last migration whose changes
    # already exist) then upgrade to apply 006+.
    print(f"[boot] Alembic upgrade failed — bootstrapping: {r.stderr.strip()[:200]}", flush=True)
    stamp = subprocess.run(
        ["python", "-m", "alembic", "stamp", "005"],
        capture_output=True, text=True,
    )
    if stamp.returncode != 0:
        print(f"[boot] Alembic stamp failed: {stamp.stderr.strip()[:200]}", flush=True)
        return

    r2 = subprocess.run(
        ["python", "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True,
    )
    if r2.returncode == 0:
        print(f"[boot] Alembic OK (after stamp): {r2.stderr.strip() or 'up to date'}", flush=True)
    else:
        print(f"[boot] Alembic still failing: {r2.stderr.strip()[:200]}", flush=True)
        print("[boot] Continuing anyway — _add_missing_columns will catch up", flush=True)


if __name__ == "__main__":
    try:
        print("[boot] Importing config...", flush=True)
        from app.config import settings  # noqa: F401 — catches SECRET_KEY guard early
        print(f"[boot] DATABASE_URL scheme: {settings.DATABASE_URL.split('://')[0] if '://' in settings.DATABASE_URL else 'unknown'}", flush=True)
        print(f"[boot] async_database_url scheme: {settings.async_database_url.split('://')[0] if '://' in settings.async_database_url else 'unknown'}", flush=True)

        print("[boot] Running Alembic migrations...", flush=True)
        _run_alembic()

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
