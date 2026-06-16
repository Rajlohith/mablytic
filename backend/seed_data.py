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

_SALT = "adwise_salt_v1"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{_SALT}{password}".encode()).hexdigest()


USERS = [
    # Admin
    dict(username="admin",  password="Admin123", first_name="System", last_name="Admin",
         email="admin@adwise.com",    gender="prefer-not-to-say", age=30,
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

ADS = [
    # Tech — A & B
    dict(title="MacBook Pro M5",          category="tech",      variant="A",
         content="Experience unprecedented power with the M5 chip. Up to 24-hour battery life and a stunning Liquid Retina XDR display. Starting at $1,999."),
    dict(title="iPhone 17 Pro",           category="tech",      variant="B",
         content="Revolutionary 5x optical zoom and an all-new titanium design. Pre-order now and get $100 off with trade-in."),
    # Gaming — A & B
    dict(title="PlayStation 6 — Pre-Order",  category="gaming", variant="A",
         content="Next-gen gaming begins this November. 8K resolution, 240fps, and true haptic feedback. Secure your console today."),
    dict(title="RTX 5090 Graphics Card",  category="gaming",    variant="B",
         content="Double the ray-tracing performance of its predecessor. AI-enhanced frame generation at 4K 144fps. Limited stock available."),
    # Fitness — A & B
    dict(title="FitPro Smartwatch Ultra", category="fitness",   variant="A",
         content="Clinical-grade heart-rate, sleep, and VO2 max tracking. 14-day battery. Waterproof to 100m. Free 3-month coaching plan included."),
    dict(title="Protein Max — Build Faster", category="fitness", variant="B",
         content="Scientifically formulated with 40g protein per serving and zero fillers. Trusted by Olympic athletes. Try your first batch for $9.99."),
    # Health — A & B
    dict(title="MyFitnessPal Premium",    category="health",    variant="A",
         content="Complete nutrition tracking, macro goals, and guided meal plans. 14-day free trial. No credit card required."),
    dict(title="MindWell — Calm in 10 Min", category="health",  variant="B",
         content="Reduce cortisol and improve sleep quality with 10-minute daily sessions. Join 5 million users already sleeping better."),
    # Food — A & B
    dict(title="HelloFresh — 50% Off First Box", category="food", variant="A",
         content="Chef-curated recipes with farm-fresh ingredients delivered to your door. Choose from 60+ weekly options. Cancel anytime."),
    dict(title="Starbucks Rewards Plus",  category="food",      variant="B",
         content="Earn 3× stars on every purchase and unlock free drinks faster. Birthday treat, early access to seasonal drinks, and more."),
    # Travel — A & B
    dict(title="Airbnb — Summer Deals 2026", category="travel", variant="A",
         content="Unique stays at up to 40% off this summer. Treehouse in Bali or cabin in the Alps — find your perfect escape."),
    dict(title="Emirates Business Class",  category="travel",   variant="B",
         content="Lie-flat beds, gourmet dining at 40,000 ft, and a private chauffeur to the airport. Book by June 30 for priority boarding."),
    # Sports — A & B
    dict(title="Nike Alphafly 3 — Race Day", category="sports", variant="A",
         content="Worn by sub-2-hour marathon runners. ZoomX foam + carbon plate for maximum energy return. Limited 2026 colorways now live."),
    dict(title="ESPN+ Annual Plan",        category="sports",   variant="B",
         content="Unlimited live sports, exclusive MLB, UFC, and NHL coverage plus original documentaries. Just $59.99/year — save 40%."),
    # Books — A & B
    dict(title="Kindle Unlimited — 3 Months Free", category="books", variant="A",
         content="Access over 4 million titles, magazines, and audiobooks on any device. No commitment — cancel at any time."),
    dict(title="Audible Premium Plus",     category="books",    variant="B",
         content="One credit per month for any audiobook plus unlimited access to the Plus Catalog. Start with a 30-day free trial."),
    # Education — A & B
    dict(title="Coursera Plus — Annual",   category="education", variant="A",
         content="7,000+ courses from Stanford, Google, and IBM. Earn a job-ready certificate in 3 months. First month free for new subscribers."),
    dict(title="MasterClass All-Access",   category="education", variant="B",
         content="Learn cooking with Gordon Ramsay, tennis with Serena Williams, and filmmaking with Spike Lee. 190+ instructors, one subscription."),
]


def seed():
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("WARNING: Database already seeded. Delete ad_recommender.db and re-run to reseed.")
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