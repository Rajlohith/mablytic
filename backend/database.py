import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load backend/.env BEFORE reading DATABASE_URL (this module is imported before
# main.py gets a chance to call load_dotenv).
load_dotenv(Path(__file__).resolve().parent / ".env")

# ── Pick database URL ─────────────────────────────────────────────────────────
# Production (Render): DATABASE_URL = your Neon.tech connection string
# Local development:   DATABASE_URL in backend/.env (see .env.example), or the
#                      default below, which matches the docker-compose.yml
#                      PostgreSQL container.
DEFAULT_LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/mablytic"
DATABASE_URL = os.environ.get("DATABASE_URL") or DEFAULT_LOCAL_URL

# Neon / Heroku-style URLs use postgres:// — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_host = (urlparse(DATABASE_URL).hostname or "").lower()
_is_local = _host in ("localhost", "127.0.0.1", "::1", "db", "postgres")

connect_args = {"connect_timeout": 10}  # Fail fast rather than hang
if not _is_local and "sslmode=" not in DATABASE_URL:
    connect_args["sslmode"] = "require"  # Neon.tech requires SSL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Re-check connections before use (important for Neon serverless)
    pool_recycle=300,  # Recycle connections every 5 minutes
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
