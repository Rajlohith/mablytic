"""One-off helper: copy existing local SQLite data into the PostgreSQL database.

    cd backend
    python migrate_sqlite_to_postgres.py [path/to/ad_recommender.db]

Uses DATABASE_URL (backend/.env or default local Postgres). Skips if the target
already has users. Safe to delete after use.
"""
import sqlite3
import sys
from datetime import datetime

from sqlalchemy import text

import models
from database import SessionLocal, engine

TABLES = ["users", "ads", "interactions"]  # parents before children
BOOL_COLS = {"is_admin"}
DT_COLS = {"created_at", "timestamp"}


def convert(col, val):
    if val is None:
        return None
    if col in BOOL_COLS:
        return bool(val)
    if col in DT_COLS and isinstance(val, str):
        return datetime.fromisoformat(val)
    return val


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else "ad_recommender.db"
    src = sqlite3.connect(src_path)
    src.row_factory = sqlite3.Row
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("Target database already has users - nothing copied.")
            return
        for table in TABLES:
            rows = src.execute(f"SELECT * FROM {table}").fetchall()
            for r in rows:
                data = {k: convert(k, r[k]) for k in r.keys()}
                cols = ", ".join(data)
                params = ", ".join(f":{k}" for k in data)
                db.execute(text(f"INSERT INTO {table} ({cols}) VALUES ({params})"), data)
            print(f"{table}: {len(rows)} rows copied")
        # Ids were inserted explicitly, so move each sequence past the max id.
        for table in TABLES:
            db.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
            ))
        db.commit()
        print("Done.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
