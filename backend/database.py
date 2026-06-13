import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ── Pick database URL ─────────────────────────────────────────────────────────
# On Render: set DATABASE_URL env var to your Neon.tech connection string
# Locally:   falls back to SQLite for development convenience
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Neon.tech gives a postgres:// URL — SQLAlchemy needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # PostgreSQL engine (Neon.tech / production)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,        # Re-check connections before use (important for Neon serverless)
        pool_recycle=300,          # Recycle connections every 5 minutes
        pool_size=5,               # Keep 5 connections in the pool
        max_overflow=10,           # Allow up to 10 extra connections under load
        connect_args={
            "sslmode": "require",  # Neon.tech requires SSL
            "connect_timeout": 10, # Fail fast rather than hang
        }
    )
else:
    # SQLite fallback for local development
    SQLITE_URL = "sqlite:///./ad_recommender.db"
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()