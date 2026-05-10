from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import random

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ADWise – PWA Ad Engine API",
    description="Backend for serving personalized ads and tracking A/B testing data.",
)

origins = [
    "http://127.0.0.1:8081",
    "http://localhost:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CORE ────────────────────────────────────────────────────────────────────

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(preferences=user.preferences)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/ads/", response_model=schemas.AdResponse)
def create_ad(ad: schemas.AdCreate, db: Session = Depends(get_db)):
    db_ad = models.Ad(**ad.model_dump())
    db.add(db_ad)
    db.commit()
    db.refresh(db_ad)
    return db_ad


@app.get("/ads/", response_model=List[schemas.AdResponse])
def list_ads(db: Session = Depends(get_db)):
    return db.query(models.Ad).all()


@app.get("/serve-ad/{user_id}", response_model=schemas.AdResponse)
def serve_ad(user_id: int, db: Session = Depends(get_db)):
    """Serves a personalized ad based on user preferences (rule-based, Phase 2)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_prefs = [p.strip().lower() for p in user.preferences.split(",") if p.strip()]
    matching_ads = db.query(models.Ad).filter(models.Ad.category.in_(user_prefs)).all()

    if matching_ads:
        selected_ad = random.choice(matching_ads)
    else:
        all_ads = db.query(models.Ad).all()
        if not all_ads:
            raise HTTPException(status_code=404, detail="No ads available in database")
        selected_ad = random.choice(all_ads)

    return selected_ad


@app.post("/interactions/", response_model=schemas.InteractionResponse)
def log_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """Logs a view or click interaction — the ML data feed."""
    if interaction.interaction_type.lower() not in ["view", "click"]:
        raise HTTPException(status_code=400, detail="Type must be 'view' or 'click'")
    db_interaction = models.Interaction(**interaction.model_dump())
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction


@app.post("/clear-database/")
def clear_database(db: Session = Depends(get_db)):
    try:
        db.query(models.Interaction).delete()
        db.query(models.Ad).delete()
        db.query(models.User).delete()
        db.commit()
        return {"message": "All data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── ADMIN ───────────────────────────────────────────────────────────────────

@app.get("/admin/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """High-level stats for the dashboard header cards."""
    total_users  = db.query(models.User).count()
    total_ads    = db.query(models.Ad).count()
    total_views  = db.query(models.Interaction).filter(models.Interaction.interaction_type == "view").count()
    total_clicks = db.query(models.Interaction).filter(models.Interaction.interaction_type == "click").count()
    global_ctr   = round((total_clicks / total_views * 100), 2) if total_views > 0 else 0
    return {
        "total_users":  total_users,
        "total_ads":    total_ads,
        "total_views":  total_views,
        "total_clicks": total_clicks,
        "global_ctr":   global_ctr,
    }


@app.get("/admin/analytics")
def get_ad_analytics(db: Session = Depends(get_db)):
    """CTR for every ad, sorted by performance — powers the analytics chart."""
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
        ctr = round((clicks / views * 100), 2) if views > 0 else 0
        result.append({
            "ad_id": ad.id, "title": ad.title,
            "category": ad.category, "variant": ad.variant,
            "views": views, "clicks": clicks, "ctr_percentage": ctr,
        })
    result.sort(key=lambda x: x["ctr_percentage"], reverse=True)
    return result


@app.get("/admin/users", response_model=List[schemas.UserResponse])
def get_admin_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/admin/ads", response_model=List[schemas.AdResponse])
def get_admin_ads(db: Session = Depends(get_db)):
    return db.query(models.Ad).all()


@app.get("/admin/analytics/user/{user_id}")
def get_user_analytics(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    interactions = db.query(models.Interaction).filter(models.Interaction.user_id == user_id).all()
    views  = sum(1 for i in interactions if i.interaction_type == "view")
    clicks = sum(1 for i in interactions if i.interaction_type == "click")
    ctr    = round((clicks / views * 100), 2) if views > 0 else 0
    return {
        "user_id": user.id, "preferences": user.preferences,
        "total_views": views, "total_clicks": clicks, "ctr": ctr,
    }


@app.get("/admin/analytics/ad/{ad_id}")
def get_ad_analytics_by_id(ad_id: int, db: Session = Depends(get_db)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    interactions = db.query(models.Interaction).filter(models.Interaction.ad_id == ad_id).all()
    views  = sum(1 for i in interactions if i.interaction_type == "view")
    clicks = sum(1 for i in interactions if i.interaction_type == "click")
    ctr    = round((clicks / views * 100), 2) if views > 0 else 0
    return {
        "ad_id": ad.id, "title": ad.title,
        "category": ad.category, "variant": ad.variant,
        "total_views": views, "total_clicks": clicks, "ctr": ctr,
    }


@app.get("/admin/history")
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    """Most recent interaction logs with denormalized user/ad data."""
    logs    = db.query(models.Interaction).order_by(desc(models.Interaction.id)).limit(limit).all()
    history = []
    for log in logs:
        u = db.query(models.User).filter(models.User.id == log.user_id).first()
        a = db.query(models.Ad).filter(models.Ad.id == log.ad_id).first()
        history.append({
            "log_id":     log.id,
            "timestamp":  log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "N/A",
            "user_id":    log.user_id,
            "user_prefs": u.preferences if u else "Unknown",
            "ad_title":   a.title if a else "Unknown",
            "variant":    a.variant if a else "-",
            "type":       log.interaction_type,
        })
    return history


@app.post("/admin/users")
def create_persona(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    new_user = models.User(preferences=user_in.preferences)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Persona created successfully", "user_id": new_user.id, "preferences": new_user.preferences}