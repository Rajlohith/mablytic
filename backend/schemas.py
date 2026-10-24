from datetime import datetime

from pydantic import BaseModel

# ── Auth ──────────────────────────────────────────────────────────────────────


class UserRegister(BaseModel):
    username: str  # letters + numbers only, validated on frontend too
    password: str  # 6-8 chars, letters + numbers only
    first_name: str
    last_name: str
    email: str
    gender: str  # male / female / non-binary / prefer-not-to-say
    age: int
    preferences: str  # comma-separated category list


class UserLogin(BaseModel):
    username: str
    password: str


# ── Legacy (kept for /users/ POST backward-compat) ────────────────────────────


class UserCreate(BaseModel):
    preferences: str


# ── Responses ─────────────────────────────────────────────────────────────────


class UserResponse(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    email: str
    gender: str
    age: int
    preferences: str
    is_admin: bool
    is_active: bool | None = True
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Slim version returned to the frontend after login."""

    id: int
    username: str
    first_name: str
    is_admin: bool

    class Config:
        from_attributes = True


# ── Ads ───────────────────────────────────────────────────────────────────────


class AdCreate(BaseModel):
    title: str
    content: str
    category: str
    variant: str  # "A" or "B"
    image_url: str | None = ""
    # v4 optional fields — omitted by old clients, defaults keep them working.
    advertiser: str | None = ""
    destination_url: str | None = ""
    placement: str | None = "any"
    status: str | None = "active"
    start_date: datetime | None = None
    end_date: datetime | None = None
    campaign_id: int | None = None


class AdResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    variant: str
    image_url: str | None = ""
    advertiser: str | None = ""
    destination_url: str | None = ""
    placement: str | None = "any"
    status: str | None = "active"
    start_date: datetime | None = None
    end_date: datetime | None = None
    campaign_id: int | None = None

    class Config:
        from_attributes = True


# ── Interactions ──────────────────────────────────────────────────────────────


class InteractionCreate(BaseModel):
    user_id: int
    ad_id: int
    interaction_type: str  # "view" or "click"


class InteractionResponse(BaseModel):
    id: int
    user_id: int
    ad_id: int
    interaction_type: str
    timestamp: datetime

    class Config:
        from_attributes = True


class AdUpdate(BaseModel):
    """Partial update — only supplied fields change."""

    title: str | None = None
    content: str | None = None
    category: str | None = None
    variant: str | None = None
    image_url: str | None = None
    advertiser: str | None = None
    destination_url: str | None = None
    placement: str | None = None
    status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    campaign_id: int | None = None
    clear_schedule: bool = False  # set True to remove start/end dates


# ── Campaigns ─────────────────────────────────────────────────────────────────


class CampaignCreate(BaseModel):
    name: str
    status: str = "active"  # active / paused / draft / ended
    budget: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    budget: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignResponse(BaseModel):
    id: int
    name: str
    status: str
    budget: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    created_at: datetime | None = None
    ad_count: int = 0
    views: int = 0
    clicks: int = 0
    ctr: float = 0


# ── Articles ──────────────────────────────────────────────────────────────────


class ArticleBase(BaseModel):
    title: str
    summary: str = ""
    body: str = ""
    category: str
    author: str = ""
    image_url: str = ""
    image_alt: str = ""
    image_credit: str = ""
    read_minutes: int = 4
    is_featured: bool = False
    status: str = "published"  # published / draft


class ArticleCreate(ArticleBase):
    slug: str | None = None  # generated from the title when omitted


class ArticleUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    body: str | None = None
    category: str | None = None
    author: str | None = None
    image_url: str | None = None
    image_alt: str | None = None
    image_credit: str | None = None
    read_minutes: int | None = None
    is_featured: bool | None = None
    status: str | None = None


class ArticleCard(BaseModel):
    """List representation — no body, to keep feed payloads small."""

    id: int
    slug: str
    title: str
    summary: str
    category: str
    author: str
    image_url: str
    image_alt: str
    image_credit: str
    read_minutes: int
    is_featured: bool
    is_demo: bool
    status: str
    published_at: datetime | None = None

    class Config:
        from_attributes = True


class ArticleDetail(ArticleCard):
    body: str


class ArticlePage(BaseModel):
    items: list[ArticleCard]
    total: int
    page: int
    page_size: int


# ── Admin helpers ─────────────────────────────────────────────────────────────


class AdminUserUpdate(BaseModel):
    is_admin: bool | None = None
    is_active: bool | None = None
    preferences: str | None = None
