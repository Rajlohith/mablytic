import hashlib
import re
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import random

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MABlytic — Personalized Ad Engine API",
    description="Backend for serving personalized ads and tracking A/B testing data.",
    version="3.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Block crawlers
@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    return "User-agent: *\nDisallow: /"

origins = [
    "https://mablytic.web.app",
    "https://mablytic.firebaseapp.com",
    "http://127.0.0.1:8081",
    "http://localhost:8081",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8001",
    "http://localhost:8001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auto-seed on startup ──────────────────────────────────────────────────────
@app.on_event("startup")
def seed_on_startup():
    """Seeds the database only if it is empty — safe to run on every cold start."""
    from seed_data import seed
    seed()


# ── Health check (used by Render keep-alive ping) ─────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "MABlytic API"}


# ── Password helpers ──────────────────────────────────────────────────────────
_SALT = "adwise_salt_v1"

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{_SALT}{password}".encode()).hexdigest()

def verify_password(plain: str, stored: str) -> bool:
    return hash_password(plain) == stored


# ── Validation ────────────────────────────────────────────────────────────────
def validate_username(username: str):
    if not re.match(r"^[a-zA-Z0-9]+$", username):
        raise HTTPException(status_code=400, detail="Username must contain only letters and numbers.")

def validate_password(password: str):
    if not re.match(r"^[a-zA-Z0-9]{6,8}$", password):
        raise HTTPException(status_code=400, detail="Password must be 6-8 alphanumeric characters.")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=schemas.UserPublic, tags=["Auth"])
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    validate_username(user.username)
    validate_password(user.password)
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=409, detail="Username already taken.")
    if user.email and db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")
    db_user = models.User(
        username=user.username,
        password_hash=hash_password(user.password),
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        gender=user.gender,
        age=user.age,
        preferences=user.preferences.lower(),
        is_admin=False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/auth/login", tags=["Auth"])
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == creds.username).first()
    if not db_user or not verify_password(creds.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {
        "id":          db_user.id,
        "username":    db_user.username,
        "first_name":  db_user.first_name,
        "last_name":   db_user.last_name,
        "is_admin":    db_user.is_admin,
        "preferences": db_user.preferences,
    }


@app.get("/auth/profile/{user_id}", response_model=schemas.UserResponse, tags=["Auth"])
def get_profile(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    return u


# ═══════════════════════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/users/", response_model=schemas.UserResponse, tags=["Users"])
def create_user_legacy(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(
        username=f"user_{random.randint(10000,99999)}",
        password_hash=hash_password("Pass12"),
        preferences=user.preferences,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/", response_model=List[schemas.UserResponse], tags=["Users"])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/users/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    return u


@app.delete("/users/{user_id}", tags=["Users"])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    db.query(models.Interaction).filter(models.Interaction.user_id == user_id).delete()
    db.delete(u)
    db.commit()
    return {"message": f"User {user_id} deleted."}


# ═══════════════════════════════════════════════════════════════════════════════
# ADS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/ads/", response_model=schemas.AdResponse, tags=["Ads"])
def create_ad(ad: schemas.AdCreate, db: Session = Depends(get_db)):
    if ad.variant not in ("A", "B"):
        raise HTTPException(status_code=400, detail="Variant must be 'A' or 'B'.")
    db_ad = models.Ad(**ad.model_dump())
    db.add(db_ad)
    db.commit()
    db.refresh(db_ad)
    return db_ad


@app.get("/ads/", response_model=List[schemas.AdResponse], tags=["Ads"])
def list_ads(db: Session = Depends(get_db)):
    return db.query(models.Ad).all()


@app.get("/ads/{ad_id}", response_model=schemas.AdResponse, tags=["Ads"])
def get_ad(ad_id: int, db: Session = Depends(get_db)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found.")
    return ad


@app.delete("/ads/{ad_id}", tags=["Ads"])
def delete_ad(ad_id: int, db: Session = Depends(get_db)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found.")
    db.query(models.Interaction).filter(models.Interaction.ad_id == ad_id).delete()
    db.delete(ad)
    db.commit()
    return {"message": f"Ad {ad_id} deleted."}


# ═══════════════════════════════════════════════════════════════════════════════
# AD SERVING
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/serve-ad/{user_id}", response_model=schemas.AdResponse, tags=["Ad Serving"])
def serve_ad(user_id: int, db: Session = Depends(get_db)):
    """
    Rule-based ad recommendation (Phase 2).
    Matches ads to user preference categories.
    Phase 3 will replace this with Thompson Sampling (Multi-Armed Bandit).
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    prefs = [p.strip().lower() for p in user.preferences.split(",") if p.strip()]
    matching = db.query(models.Ad).filter(models.Ad.category.in_(prefs)).all()

    if matching:
        return random.choice(matching)

    all_ads = db.query(models.Ad).all()
    if not all_ads:
        raise HTTPException(status_code=404, detail="No ads in database.")
    return random.choice(all_ads)


# ═══════════════════════════════════════════════════════════════════════════════
# INTERACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/interactions/", response_model=schemas.InteractionResponse, tags=["Interactions"])
def log_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    if interaction.interaction_type.lower() not in ("view", "click"):
        raise HTTPException(status_code=400, detail="interaction_type must be 'view' or 'click'.")
    db_i = models.Interaction(**interaction.model_dump())
    db.add(db_i)
    db.commit()
    db.refresh(db_i)
    return db_i


@app.get("/interactions/", response_model=List[schemas.InteractionResponse], tags=["Interactions"])
def list_interactions(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Interaction).order_by(desc(models.Interaction.id)).limit(limit).all()


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/clear-database/", tags=["Database"])
def clear_database(db: Session = Depends(get_db)):
    try:
        db.query(models.Interaction).delete()
        db.query(models.Ad).delete()
        db.query(models.User).delete()
        db.commit()
        return {"message": "All data cleared successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/dashboard-stats", tags=["Admin"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_users  = db.query(models.User).filter(models.User.is_admin == False).count()
    total_admins = db.query(models.User).filter(models.User.is_admin == True).count()
    total_ads    = db.query(models.Ad).count()
    total_views  = db.query(models.Interaction).filter(models.Interaction.interaction_type == "view").count()
    total_clicks = db.query(models.Interaction).filter(models.Interaction.interaction_type == "click").count()
    global_ctr   = round((total_clicks / total_views * 100), 2) if total_views > 0 else 0
    return {
        "total_users":  total_users,
        "total_admins": total_admins,
        "total_ads":    total_ads,
        "total_views":  total_views,
        "total_clicks": total_clicks,
        "global_ctr":   global_ctr,
    }


@app.get("/admin/analytics", tags=["Admin"])
def get_ad_analytics(db: Session = Depends(get_db)):
    ads = db.query(models.Ad).all()
    result = []
    for ad in ads:
        views  = db.query(models.Interaction).filter(
            models.Interaction.ad_id == ad.id,
            models.Interaction.interaction_type == "view"
        ).count()
        clicks = db.query(models.Interaction).filter(
            models.Interaction.ad_id == ad.id,
            models.Interaction.interaction_type == "click"
        ).count()
        result.append({
            "ad_id": ad.id, "title": ad.title,
            "category": ad.category, "variant": ad.variant,
            "views": views, "clicks": clicks,
            "ctr_percentage": round((clicks / views * 100), 2) if views > 0 else 0,
        })
    result.sort(key=lambda x: x["ctr_percentage"], reverse=True)
    return result


@app.get("/admin/users", response_model=List[schemas.UserResponse], tags=["Admin"])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id).all()


@app.get("/admin/ads", response_model=List[schemas.AdResponse], tags=["Admin"])
def get_all_ads(db: Session = Depends(get_db)):
    return db.query(models.Ad).order_by(models.Ad.id).all()


@app.get("/admin/analytics/user/{user_id}", tags=["Admin"])
def get_user_analytics(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    interactions = db.query(models.Interaction).filter(models.Interaction.user_id == user_id).all()
    views  = sum(1 for i in interactions if i.interaction_type == "view")
    clicks = sum(1 for i in interactions if i.interaction_type == "click")
    return {
        "user_id":      u.id,
        "username":     u.username,
        "full_name":    f"{u.first_name} {u.last_name}".strip(),
        "email":        u.email,
        "gender":       u.gender,
        "age":          u.age,
        "preferences":  u.preferences,
        "total_views":  views,
        "total_clicks": clicks,
        "ctr":          round((clicks / views * 100), 2) if views > 0 else 0,
    }


@app.get("/admin/analytics/ad/{ad_id}", tags=["Admin"])
def get_ad_analytics_by_id(ad_id: int, db: Session = Depends(get_db)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found.")
    interactions = db.query(models.Interaction).filter(models.Interaction.ad_id == ad_id).all()
    views  = sum(1 for i in interactions if i.interaction_type == "view")
    clicks = sum(1 for i in interactions if i.interaction_type == "click")
    return {
        "ad_id":        ad.id,
        "title":        ad.title,
        "category":     ad.category,
        "variant":      ad.variant,
        "image_url":    ad.image_url,
        "total_views":  views,
        "total_clicks": clicks,
        "ctr":          round((clicks / views * 100), 2) if views > 0 else 0,
    }


@app.get("/admin/history", tags=["Admin"])
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(models.Interaction).order_by(desc(models.Interaction.id)).limit(limit).all()
    out = []
    for log in logs:
        u = db.query(models.User).filter(models.User.id == log.user_id).first()
        a = db.query(models.Ad).filter(models.Ad.id == log.ad_id).first()
        out.append({
            "log_id":     log.id,
            "timestamp":  log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "N/A",
            "user_id":    log.user_id,
            "username":   u.username    if u else "Unknown",
            "user_prefs": u.preferences if u else "—",
            "ad_title":   a.title       if a else "Unknown",
            "variant":    a.variant     if a else "-",
            "type":       log.interaction_type,
        })
    return out


@app.post("/admin/users", tags=["Admin"])
def admin_create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    new_user = models.User(
        username=f"persona_{random.randint(10000,99999)}",
        password_hash=hash_password("Pass12"),
        preferences=user_in.preferences,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Persona created.", "user_id": new_user.id, "username": new_user.username}