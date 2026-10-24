"""Tiny additive schema migration.

`Base.metadata.create_all` creates new tables but never alters existing ones.
Databases created by earlier versions (v3) therefore lack the columns that v4
added to `users` and `ads`. This adds them if missing; it never drops or
rewrites anything, and is safe to run on every start-up.
"""

from sqlalchemy import inspect, text

# table -> [(column, {dialect: DDL type + default})]
_ADDED_COLUMNS = {
    "users": [
        ("is_active", "BOOLEAN DEFAULT {true}"),
    ],
    "ads": [
        ("advertiser", "VARCHAR DEFAULT ''"),
        ("destination_url", "VARCHAR DEFAULT ''"),
        ("placement", "VARCHAR DEFAULT 'any'"),
        ("status", "VARCHAR DEFAULT 'active'"),
        ("start_date", "{timestamp}"),
        ("end_date", "{timestamp}"),
        ("campaign_id", "INTEGER"),
    ],
}


def ensure_schema(engine) -> list[str]:
    """Add any v4 columns missing from existing tables. Returns what was added."""
    is_sqlite = engine.dialect.name == "sqlite"
    fmt = {
        "true": "1" if is_sqlite else "TRUE",
        "timestamp": "DATETIME" if is_sqlite else "TIMESTAMP WITH TIME ZONE",
    }
    inspector = inspect(engine)
    added: list[str] = []
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            if not inspector.has_table(table):
                continue  # create_all will build it with every column
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns:
                if name in existing:
                    continue
                conn.execute(
                    text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl.format(**fmt)}')
                )
                added.append(f"{table}.{name}")
        # Rows that predate the column get a sensible value.
        if "users.is_active" in added:
            conn.execute(text("UPDATE users SET is_active = " + fmt["true"]))
        if "ads.status" in added:
            conn.execute(text("UPDATE ads SET status = 'active'"))
        if "ads.placement" in added:
            conn.execute(text("UPDATE ads SET placement = 'any'"))
    return added
