"""
Run this once after starting the backend:
    cd backend && python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import hashlib
from database import SessionLocal, engine
import models
from models import Base

Base.metadata.create_all(bind=engine)

_SALT = "mablytic_salt_v1"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{_SALT}{password}".encode()).hexdigest()


USERS = [
    # Admin
    dict(username="admin",  password="Admin123", first_name="System", last_name="Admin",
         email="admin@mablytic.com",    gender="prefer-not-to-say", age=30,
         preferences="tech,gaming,fitness,health,food,travel,sports,books,education",
         is_admin=True),
    # Regular users — credentials to share with testers
    dict(username="alice",  password="Tech12",  first_name="Alice",  last_name="Thompson",
         email="alice@example.com",   gender="female", age=28, preferences="tech,gaming"),
    dict(username="bobfit", password="Fit456",  first_name="Bob",    last_name="Richards",
         email="bob@example.com",     gender="male",   age=32, preferences="fitness,health"),
    dict(username="carol",  password="Food78",  first_name="Carol",  last_name="Martinez",
         email="carol@example.com",   gender="female", age=25, preferences="food,travel"),
    dict(username="davidg", password="Game12",  first_name="David",  last_name="Garcia",
         email="david@example.com",   gender="male",   age=22, preferences="gaming,sports"),
    dict(username="emmaed", password="Book34",  first_name="Emma",   last_name="Edwards",
         email="emma@example.com",    gender="female", age=35, preferences="books,education"),
]

from demo_content import LEGACY_ADS as ADS  # noqa: E402  (moved; unchanged content)


def seed_content():
    """Idempotent v4 content: ad creatives and campaigns.

    News articles are not seeded: news_ingest.py pulls real stories from RSS
    feeds / free APIs. Safe on every start-up and on databases created by older
    versions: ads are matched by title, and existing ads only gain an image if
    they have none.
    """
    from demo_content import CAMPAIGNS, LEGACY_ADS, NEW_ADS, slugify
    from migrations import ensure_schema

    ensure_schema(engine)
    db = SessionLocal()
    try:
        added = {"ads": 0, "campaigns": 0}

        campaigns = {}
        for name, status, budget in CAMPAIGNS:
            c = db.query(models.Campaign).filter(models.Campaign.name == name).first()
            if not c:
                c = models.Campaign(name=name, status=status, budget=budget)
                db.add(c)
                db.flush()
                added["campaigns"] += 1
            campaigns[name] = c

        # Existing (v3) ads: attach generated artwork only where none is set.
        for a in LEGACY_ADS:
            ad = db.query(models.Ad).filter(models.Ad.title == a["title"]).first()
            if ad and not ad.image_url:
                ad.image_url = f"/art/ads/{slugify(a['title'])}.svg"

        camp_names = [c[0] for c in CAMPAIGNS]
        for i, (title, advertiser, cat, variant, placement, copy) in enumerate(NEW_ADS):
            if db.query(models.Ad).filter(models.Ad.title == title).first():
                continue
            camp = campaigns[camp_names[i % 2]]  # active campaigns only
            db.add(
                models.Ad(
                    title=title,
                    content=copy,
                    category=cat,
                    variant=variant,
                    image_url=f"/art/ads/{slugify(title)}.svg",
                    advertiser=advertiser,
                    destination_url="https://example.com/demo-advertiser",
                    placement=placement,
                    status="active",
                    campaign_id=camp.id,
                )
            )
            added["ads"] += 1

        db.commit()
        if any(added.values()):
            print(f"✓ v4 demo content added: {added}")
        return added
    except Exception as e:
        db.rollback()
        print(f"Content seed failed: {e}")
        raise
    finally:
        db.close()


def seed():
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("WARNING: Database already seeded. Clear the tables (or drop the database) and re-run to reseed.")
            return

        # Insert users
        for u in USERS:
            db.add(models.User(
                username      = u["username"],
                password_hash = hash_password(u["password"]),
                first_name    = u["first_name"],
                last_name     = u["last_name"],
                email         = u["email"],
                gender        = u["gender"],
                age           = u["age"],
                preferences   = u["preferences"],
                is_admin      = u.get("is_admin", False),
            ))

        # Insert ads
        for a in ADS:
            db.add(models.Ad(image_url="", **a))

        db.commit()

        print("✓ Database seeded successfully!\n")
        print("═" * 46)
        print("  LOGIN CREDENTIALS")
        print("═" * 46)
        print(f"  {'ROLE':<10} {'USERNAME':<10} {'PASSWORD':<10} PREFERENCES")
        print("─" * 46)
        print(f"  {'Admin':<10} {'admin':<10} {'Admin123':<10} all")
        print(f"  {'User':<10} {'alice':<10} {'Tech12':<10} tech, gaming")
        print(f"  {'User':<10} {'bobfit':<10} {'Fit456':<10} fitness, health")
        print(f"  {'User':<10} {'carol':<10} {'Food78':<10} food, travel")
        print(f"  {'User':<10} {'davidg':<10} {'Game12':<10} gaming, sports")
        print(f"  {'User':<10} {'emmaed':<10} {'Book34':<10} books, education")
        print("═" * 46)
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    seed_content()