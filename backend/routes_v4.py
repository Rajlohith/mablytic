"""v4 API additions: articles, campaigns, ad management, targeting, overview.

Everything here is additive. Existing endpoints and their contracts live in
main.py and keep working; main.py only gains the `include_router` call, a
deliverability filter in /serve-ad, and a few small auth endpoints.
"""

import re
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

import models
import schemas
from ad_serving import ThompsonSamplingBandit, user_preference_categories
from auth import get_current_user, require_admin
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

router = APIRouter()

AD_STATUSES = ("active", "paused", "draft")
AD_PLACEMENTS = ("any", "feed", "sidebar", "inline", "banner")
CAMPAIGN_STATUSES = ("active", "paused", "draft", "ended")
ARTICLE_STATUSES = ("published", "draft")

# Ad/user preference categories -> news categories (used for personalization).
PREFERENCE_TO_ARTICLE_CATEGORIES: dict[str, list[str]] = {
    "tech": ["Technology", "Science"],
    "gaming": ["Technology", "Arts"],
    "fitness": ["Health", "Sports"],
    "health": ["Health", "Science"],
    "food": ["Health", "Business"],
    "travel": ["Travel", "World"],
    "sports": ["Sports"],
    "books": ["Arts", "Opinion"],
    "education": ["Education", "Science"],
}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; treat them as UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _in_window(start, end, now) -> bool:
    start, end = _utc(start), _utc(end)
    return (start is None or start <= now) and (end is None or now <= end)


def is_ad_deliverable(ad: models.Ad, now: datetime | None = None) -> bool:
    """Delivery rules: active status, inside its schedule, campaign live."""
    now = now or datetime.now(UTC)
    if (ad.status or "active") != "active":
        return False
    if not _in_window(ad.start_date, ad.end_date, now):
        return False
    campaign = ad.campaign
    if campaign is not None:
        if (campaign.status or "active") != "active":
            return False
        if not _in_window(campaign.start_date, campaign.end_date, now):
            return False
    return True


def deliverable_ads(db: Session, placement: str | None = None) -> list[models.Ad]:
    ads = [a for a in db.query(models.Ad).all() if is_ad_deliverable(a)]
    if placement and placement != "any":
        # Ads configured for "any" fit everywhere; otherwise placement must match.
        ads = [a for a in ads if (a.placement or "any") in ("any", placement)]
    return ads


def _parse_ids(raw: str) -> set[int]:
    try:
        ids = {int(v.strip()) for v in raw.split(",") if v.strip()}
        if any(i <= 0 for i in ids):
            raise ValueError
        return ids
    except ValueError:
        raise HTTPException(
            status_code=422, detail="exclude_ids must contain positive integer IDs."
        )


def _pick_distinct(
    db: Session, pool: list[models.Ad], count: int, excluded: set[int]
) -> list[models.Ad]:
    bandit = ThompsonSamplingBandit(db)
    remaining = [a for a in pool if a.id not in excluded] or list(pool)
    chosen: list[models.Ad] = []
    while remaining and len(chosen) < count:
        ad = bandit.choose(remaining)
        chosen.append(ad)
        remaining = [a for a in remaining if a.id != ad.id]
    return chosen


def _validate_url(value: str | None, field: str, allow_relative: bool) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if allow_relative and value.startswith("/") and not value.startswith("//"):
        return value
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(
            status_code=422,
            detail=f"{field} must be a valid http(s) URL"
            + (" or a path starting with /." if allow_relative else "."),
        )
    return value


def _validate_ad_fields(data: dict, db: Session) -> None:
    if data.get("variant") is not None and data["variant"] not in ("A", "B"):
        raise HTTPException(status_code=400, detail="Variant must be 'A' or 'B'.")
    if data.get("placement") is not None and data["placement"] not in AD_PLACEMENTS:
        raise HTTPException(
            status_code=422, detail=f"placement must be one of {AD_PLACEMENTS}."
        )
    if data.get("status") is not None and data["status"] not in AD_STATUSES:
        raise HTTPException(
            status_code=422, detail=f"status must be one of {AD_STATUSES}."
        )
    if "destination_url" in data:
        data["destination_url"] = _validate_url(
            data["destination_url"], "destination_url", allow_relative=False
        )
    if "image_url" in data:
        data["image_url"] = _validate_url(
            data["image_url"], "image_url", allow_relative=True
        )
    start, end = _utc(data.get("start_date")), _utc(data.get("end_date"))
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date.")
    if data.get("campaign_id") is not None:
        if not db.get(models.Campaign, data["campaign_id"]):
            raise HTTPException(status_code=404, detail="Campaign not found.")


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:90] or "article"


def _unique_slug(db: Session, base: str, ignore_id: int | None = None) -> str:
    slug, n = base, 2
    while True:
        q = db.query(models.Article).filter(models.Article.slug == slug)
        if ignore_id:
            q = q.filter(models.Article.id != ignore_id)
        if not q.first():
            return slug
        slug, n = f"{base}-{n}", n + 1


def _article_filters(q, category: str | None, search: str | None):
    if category:
        q = q.filter(func.lower(models.Article.category) == category.lower())
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                func.lower(models.Article.title).like(like),
                func.lower(models.Article.summary).like(like),
            )
        )
    return q


def _page(q, page: int, page_size: int) -> schemas.ArticlePage:
    total = q.count()
    items = (
        q.order_by(desc(models.Article.published_at), desc(models.Article.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.ArticlePage(
        items=items, total=total, page=page, page_size=page_size
    )


def _ad_stats(db: Session) -> dict[int, tuple[int, int]]:
    rows = (
        db.query(
            models.Interaction.ad_id,
            models.Interaction.interaction_type,
            func.count(models.Interaction.id),
        )
        .group_by(models.Interaction.ad_id, models.Interaction.interaction_type)
        .all()
    )
    stats: dict[int, list[int]] = {}
    for ad_id, kind, n in rows:
        entry = stats.setdefault(ad_id, [0, 0])
        if kind == "view":
            entry[0] = n
        elif kind == "click":
            entry[1] = n
    return {k: (v[0], v[1]) for k, v in stats.items()}


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC ARTICLES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/articles", response_model=schemas.ArticlePage, tags=["Articles"])
def list_articles(
    category: str | None = None,
    q: str | None = None,
    featured: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    query = db.query(models.Article).filter(models.Article.status == "published")
    query = _article_filters(query, category, q)
    if featured is not None:
        query = query.filter(models.Article.is_featured == featured)
    return _page(query, page, page_size)


@router.get("/articles/categories", tags=["Articles"])
def article_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Article.category, func.count(models.Article.id))
        .filter(models.Article.status == "published")
        .group_by(models.Article.category)
        .order_by(models.Article.category)
        .all()
    )
    return [{"name": name, "count": n} for name, n in rows]


@router.get("/articles/sections", tags=["Articles"])
def article_sections(
    per_section: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Latest articles grouped by category — one call for the homepage grids."""
    cats = (
        db.query(models.Article.category, func.count(models.Article.id))
        .filter(models.Article.status == "published")
        .group_by(models.Article.category)
        .all()
    )
    out = []
    for name, total in cats:
        items = (
            db.query(models.Article)
            .filter(models.Article.status == "published", models.Article.category == name)
            .order_by(desc(models.Article.published_at), desc(models.Article.id))
            .limit(per_section)
            .all()
        )
        out.append(
            {
                "name": name,
                "count": total,
                "items": [schemas.ArticleCard.model_validate(a).model_dump(mode="json") for a in items],
            }
        )
    return out


@router.get("/articles/for-you", response_model=schemas.ArticlePage, tags=["Articles"])
def articles_for_you(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Articles in categories mapped from the user's saved preferences."""
    cats: list[str] = []
    for pref in user_preference_categories(user):
        cats += PREFERENCE_TO_ARTICLE_CATEGORIES.get(pref, [])
    query = db.query(models.Article).filter(models.Article.status == "published")
    if cats:
        query = query.filter(models.Article.category.in_(sorted(set(cats))))
    return _page(query, page, page_size)


@router.get("/articles/{slug}", response_model=schemas.ArticleDetail, tags=["Articles"])
def get_article(slug: str, db: Session = Depends(get_db)):
    art = (
        db.query(models.Article)
        .filter(models.Article.slug == slug, models.Article.status == "published")
        .first()
    )
    if not art:
        raise HTTPException(status_code=404, detail="Article not found.")
    return art


@router.get("/articles/{slug}/related", response_model=list[schemas.ArticleCard], tags=["Articles"])
def related_articles(slug: str, limit: int = Query(4, ge=1, le=12), db: Session = Depends(get_db)):
    art = db.query(models.Article).filter(models.Article.slug == slug).first()
    if not art:
        raise HTTPException(status_code=404, detail="Article not found.")
    return (
        db.query(models.Article)
        .filter(
            models.Article.status == "published",
            models.Article.category == art.category,
            models.Article.id != art.id,
        )
        .order_by(desc(models.Article.published_at))
        .limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
# AD DELIVERY (public + personalized batch)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/public/ads", response_model=list[schemas.AdResponse], tags=["Ad Serving"])
def public_ads(
    count: int = Query(1, ge=1, le=12),
    placement: str = "any",
    exclude_ids: str = "",
    db: Session = Depends(get_db),
):
    """Anonymous ad delivery: schedule/status rules + Thompson Sampling.

    No personalization and no interaction logging (interactions need a user).
    Returns [] when nothing is deliverable so the UI can show a fallback.
    """
    if placement not in AD_PLACEMENTS:
        raise HTTPException(status_code=422, detail=f"placement must be one of {AD_PLACEMENTS}.")
    pool = deliverable_ads(db, placement)
    return _pick_distinct(db, pool, count, _parse_ids(exclude_ids)) if pool else []


@router.get("/serve-ads/{user_id}", response_model=list[schemas.AdResponse], tags=["Ad Serving"])
def serve_ads_batch(
    user_id: int,
    count: int = Query(1, ge=1, le=12),
    placement: str = "any",
    exclude_ids: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Batch version of /serve-ad: preference filter first, then Thompson Sampling."""
    if not current_user.is_admin and user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only request recommendations for your own account.",
        )
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if placement not in AD_PLACEMENTS:
        raise HTTPException(status_code=422, detail=f"placement must be one of {AD_PLACEMENTS}.")

    pool = deliverable_ads(db, placement)
    if not pool:
        return []
    prefs = user_preference_categories(user)
    if prefs:
        matching = [a for a in pool if (a.category or "").lower() in prefs]
        # Keep preference matches first, but top up from the rest so a batch
        # of several ads is never forced to repeat creatives.
        others = [a for a in pool if a not in matching]
        excluded = _parse_ids(exclude_ids)
        picked = _pick_distinct(db, matching, count, excluded) if matching else []
        if len(picked) < count and others:
            picked += _pick_distinct(
                db, others, count - len(picked), excluded | {a.id for a in picked}
            )
        return picked
    return _pick_distinct(db, pool, count, _parse_ids(exclude_ids))


# ═══════════════════════════════════════════════════════════════════════════════
# USER SELF-SERVICE
# ═══════════════════════════════════════════════════════════════════════════════


class _PrefUpdate(schemas.BaseModel):
    preferences: str


@router.get("/auth/me", response_model=schemas.UserResponse, tags=["Auth"])
def me(user: models.User = Depends(get_current_user)):
    return user


@router.put("/auth/preferences", response_model=schemas.UserResponse, tags=["Auth"])
def update_my_preferences(
    body: _PrefUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    prefs = sorted(
        {p.strip().lower() for p in body.preferences.split(",") if p.strip()}
    )
    unknown = [p for p in prefs if p not in PREFERENCE_TO_ARTICLE_CATEGORIES]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown preference(s): {', '.join(unknown)}.")
    user.preferences = ",".join(prefs)
    db.commit()
    db.refresh(user)
    return user


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — ADS
# ═══════════════════════════════════════════════════════════════════════════════


@router.put("/admin/ads/{ad_id}", response_model=schemas.AdResponse, tags=["Admin"])
def update_ad(
    ad_id: int,
    body: schemas.AdUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    ad = db.get(models.Ad, ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found.")
    data = body.model_dump(exclude_unset=True)
    clear = data.pop("clear_schedule", False)
    _validate_ad_fields(data, db)
    for field, value in data.items():
        setattr(ad, field, value)
    if clear:
        ad.start_date = None
        ad.end_date = None
    db.commit()
    db.refresh(ad)
    return ad


@router.post("/admin/ads", response_model=schemas.AdResponse, tags=["Admin"])
def admin_create_ad(
    body: schemas.AdCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    data = body.model_dump()
    _validate_ad_fields(data, db)
    ad = models.Ad(**data)
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ad


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — CAMPAIGNS
# ═══════════════════════════════════════════════════════════════════════════════


def _campaign_out(c: models.Campaign, stats: dict[int, tuple[int, int]]) -> schemas.CampaignResponse:
    views = sum(stats.get(a.id, (0, 0))[0] for a in c.ads)
    clicks = sum(stats.get(a.id, (0, 0))[1] for a in c.ads)
    return schemas.CampaignResponse(
        id=c.id,
        name=c.name,
        status=c.status,
        budget=c.budget,
        start_date=c.start_date,
        end_date=c.end_date,
        created_at=c.created_at,
        ad_count=len(c.ads),
        views=views,
        clicks=clicks,
        ctr=round(clicks / views * 100, 2) if views else 0,
    )


def _validate_campaign(data: dict) -> None:
    if data.get("status") is not None and data["status"] not in CAMPAIGN_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {CAMPAIGN_STATUSES}.")
    if data.get("budget") is not None and data["budget"] < 0:
        raise HTTPException(status_code=422, detail="budget cannot be negative.")
    if data.get("name") is not None and not data["name"].strip():
        raise HTTPException(status_code=422, detail="name is required.")
    s, e = _utc(data.get("start_date")), _utc(data.get("end_date"))
    if s and e and e < s:
        raise HTTPException(status_code=422, detail="end_date must be after start_date.")


@router.get("/admin/campaigns", response_model=list[schemas.CampaignResponse], tags=["Admin"])
def list_campaigns(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    stats = _ad_stats(db)
    return [_campaign_out(c, stats) for c in db.query(models.Campaign).order_by(models.Campaign.id).all()]


@router.post("/admin/campaigns", response_model=schemas.CampaignResponse, tags=["Admin"], status_code=201)
def create_campaign(
    body: schemas.CampaignCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    data = body.model_dump()
    data["name"] = data["name"].strip()
    _validate_campaign(data)
    if db.query(models.Campaign).filter(models.Campaign.name == data["name"]).first():
        raise HTTPException(status_code=409, detail="A campaign with that name already exists.")
    c = models.Campaign(**data)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _campaign_out(c, {})


@router.put("/admin/campaigns/{campaign_id}", response_model=schemas.CampaignResponse, tags=["Admin"])
def update_campaign(
    campaign_id: int,
    body: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    c = db.get(models.Campaign, campaign_id)
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
        clash = (
            db.query(models.Campaign)
            .filter(models.Campaign.name == data["name"], models.Campaign.id != c.id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="A campaign with that name already exists.")
    _validate_campaign({**{"start_date": c.start_date, "end_date": c.end_date}, **data})
    for field, value in data.items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return _campaign_out(c, _ad_stats(db))


@router.delete("/admin/campaigns/{campaign_id}", tags=["Admin"])
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    c = db.get(models.Campaign, campaign_id)
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    for ad in c.ads:  # keep the ads; they just become campaign-less
        ad.campaign_id = None
    db.delete(c)
    db.commit()
    return {"message": f"Campaign {campaign_id} deleted. Its ads were kept."}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — USERS
# ═══════════════════════════════════════════════════════════════════════════════


@router.put("/admin/users/{user_id}", response_model=schemas.UserResponse, tags=["Admin"])
def admin_update_user(
    user_id: int,
    body: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    data = body.model_dump(exclude_unset=True)
    if u.id == admin.id and (data.get("is_admin") is False or data.get("is_active") is False):
        raise HTTPException(
            status_code=400,
            detail="You cannot remove your own admin role or deactivate your own account.",
        )
    if "preferences" in data and data["preferences"] is not None:
        prefs = sorted({p.strip().lower() for p in data["preferences"].split(",") if p.strip()})
        unknown = [p for p in prefs if p not in PREFERENCE_TO_ARTICLE_CATEGORIES]
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown preference(s): {', '.join(unknown)}.")
        data["preferences"] = ",".join(prefs)
    for field, value in data.items():
        if value is not None:
            setattr(u, field, value)
    db.commit()
    db.refresh(u)
    return u


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — ARTICLES
# ═══════════════════════════════════════════════════════════════════════════════


def _validate_article(data: dict) -> None:
    if data.get("status") is not None and data["status"] not in ARTICLE_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {ARTICLE_STATUSES}.")
    if data.get("title") is not None and not data["title"].strip():
        raise HTTPException(status_code=422, detail="title is required.")
    if data.get("category") is not None and not data["category"].strip():
        raise HTTPException(status_code=422, detail="category is required.")
    if data.get("read_minutes") is not None and not 1 <= data["read_minutes"] <= 120:
        raise HTTPException(status_code=422, detail="read_minutes must be between 1 and 120.")
    if "image_url" in data:
        data["image_url"] = _validate_url(data["image_url"], "image_url", allow_relative=True)


@router.get("/admin/articles", response_model=schemas.ArticlePage, tags=["Admin"])
def admin_list_articles(
    category: str | None = None,
    q: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    query = _article_filters(db.query(models.Article), category, q)
    if status:
        query = query.filter(models.Article.status == status)
    return _page(query, page, page_size)


@router.get("/admin/articles/{article_id}", response_model=schemas.ArticleDetail, tags=["Admin"])
def admin_get_article(
    article_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    art = db.get(models.Article, article_id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found.")
    return art


@router.post("/admin/articles", response_model=schemas.ArticleDetail, tags=["Admin"], status_code=201)
def admin_create_article(
    body: schemas.ArticleCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    data = body.model_dump()
    _validate_article(data)
    data["slug"] = _unique_slug(db, _slugify(data.get("slug") or data["title"]))
    art = models.Article(**data, is_demo=False)
    db.add(art)
    db.commit()
    db.refresh(art)
    return art


@router.put("/admin/articles/{article_id}", response_model=schemas.ArticleDetail, tags=["Admin"])
def admin_update_article(
    article_id: int,
    body: schemas.ArticleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    art = db.get(models.Article, article_id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found.")
    data = body.model_dump(exclude_unset=True)
    _validate_article(data)
    for field, value in data.items():
        if value is not None:
            setattr(art, field, value)
    db.commit()
    db.refresh(art)
    return art


@router.delete("/admin/articles/{article_id}", tags=["Admin"])
def admin_delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    art = db.get(models.Article, article_id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found.")
    db.delete(art)
    db.commit()
    return {"message": f"Article {article_id} deleted."}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — OVERVIEW + TARGETING
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/admin/overview", tags=["Admin"])
def admin_overview(
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    now = datetime.now(UTC)
    since = now - timedelta(days=days)

    # Daily series — bucketed in Python so it works on SQLite and Postgres alike.
    rows = (
        db.query(models.Interaction.timestamp, models.Interaction.interaction_type)
        .filter(models.Interaction.timestamp >= since)
        .all()
    )
    buckets = {
        (now - timedelta(days=i)).date().isoformat(): {"views": 0, "clicks": 0}
        for i in range(days - 1, -1, -1)
    }
    for ts, kind in rows:
        key = _utc(ts).date().isoformat()
        if key in buckets and kind in ("view", "click"):
            buckets[key]["views" if kind == "view" else "clicks"] += 1

    stats = _ad_stats(db)
    ads = db.query(models.Ad).all()
    top = sorted(
        (
            {
                "ad_id": a.id,
                "title": a.title,
                "views": stats.get(a.id, (0, 0))[0],
                "clicks": stats.get(a.id, (0, 0))[1],
            }
            for a in ads
        ),
        key=lambda r: (r["clicks"], r["views"]),
        reverse=True,
    )[:5]
    for r in top:
        r["ctr"] = round(r["clicks"] / r["views"] * 100, 2) if r["views"] else 0

    total_views = sum(v for v, _ in stats.values())
    total_clicks = sum(c for _, c in stats.values())
    campaigns = db.query(models.Campaign).all()

    return {
        "totals": {
            "users": db.query(models.User).filter(models.User.is_admin == False).count(),  # noqa: E712
            "admins": db.query(models.User).filter(models.User.is_admin == True).count(),  # noqa: E712
            "ads": len(ads),
            "active_ads": sum(1 for a in ads if is_ad_deliverable(a, now)),
            "campaigns": len(campaigns),
            "active_campaigns": sum(1 for c in campaigns if c.status == "active"),
            "articles": db.query(models.Article).count(),
            "published_articles": db.query(models.Article).filter(models.Article.status == "published").count(),
            "views": total_views,
            "clicks": total_clicks,
            "ctr": round(total_clicks / total_views * 100, 2) if total_views else 0,
        },
        "daily": [{"date": d, **v} for d, v in buckets.items()],
        "top_ads": top,
        "campaigns": [c.model_dump() for c in (_campaign_out(c, stats) for c in campaigns)],
        "system": {"database": "ok", "server_time": now.isoformat()},
    }


@router.get("/admin/targeting", tags=["Admin"])
def admin_targeting(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    """What the serving engine can actually target on: preference categories."""
    stats = _ad_stats(db)
    ads = db.query(models.Ad).all()
    users = db.query(models.User).filter(models.User.is_admin == False).all()  # noqa: E712
    out = []
    for cat, news_cats in PREFERENCE_TO_ARTICLE_CATEGORIES.items():
        cat_ads = [a for a in ads if (a.category or "").lower() == cat]
        views = sum(stats.get(a.id, (0, 0))[0] for a in cat_ads)
        clicks = sum(stats.get(a.id, (0, 0))[1] for a in cat_ads)
        out.append(
            {
                "category": cat,
                "news_categories": news_cats,
                "ads": len(cat_ads),
                "active_ads": sum(1 for a in cat_ads if is_ad_deliverable(a)),
                "users": sum(1 for u in users if cat in user_preference_categories(u)),
                "views": views,
                "clicks": clicks,
                "ctr": round(clicks / views * 100, 2) if views else 0,
            }
        )
    return {
        "categories": out,
        "criteria": {
            "supported": ["User preference category matches ad category", "Thompson Sampling over view/click history", "Ad status, schedule window, campaign status/window, placement"],
            "not_supported": ["Age targeting", "Gender targeting", "Geographic targeting"],
        },
    }
