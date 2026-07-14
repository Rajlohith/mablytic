from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username:   str          # letters + numbers only, validated on frontend too
    password:   str          # 6-8 chars, letters + numbers only
    first_name: str
    last_name:  str
    email:      str
    gender:     str          # male / female / non-binary / prefer-not-to-say
    age:        int
    preferences: str         # comma-separated category list


class UserLogin(BaseModel):
    username: str
    password: str


# ── Legacy (kept for /users/ POST backward-compat) ────────────────────────────

class UserCreate(BaseModel):
    preferences: str


# ── Responses ─────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id:          int
    username:    str
    first_name:  str
    last_name:   str
    email:       str
    gender:      str
    age:         int
    preferences: str
    is_admin:    bool
    created_at:  datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Slim version returned to the frontend after login."""
    id:         int
    username:   str
    first_name: str
    is_admin:   bool

    class Config:
        from_attributes = True


# ── Ads ───────────────────────────────────────────────────────────────────────

class AdCreate(BaseModel):
    title:     str
    content:   str
    category:  str
    variant:   str           # "A" or "B"
    image_url: Optional[str] = ""


class AdResponse(BaseModel):
    id:        int
    title:     str
    content:   str
    category:  str
    variant:   str
    image_url: Optional[str] = ""

    class Config:
        from_attributes = True


# ── Interactions ──────────────────────────────────────────────────────────────

class InteractionCreate(BaseModel):
    user_id:          int
    ad_id:            int
    interaction_type: str    # "view" or "click"


class InteractionResponse(BaseModel):
    id:               int
    user_id:          int
    ad_id:            int
    interaction_type: str
    timestamp:        datetime

    class Config:
        from_attributes = True


# Push Notifications

class PushSubscriptionCreate(BaseModel):
    user_id: int
    endpoint: str
    keys: Dict[str, str]


class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    endpoint: str

    class Config:
        from_attributes = True


class AdminPushCreate(BaseModel):
    user_id: int
    title: str
    body: str
    url: Optional[str] = "/feed.html"


class AdminPushResponse(BaseModel):
    user_id: int
    attempted: int
    sent: int
    failed: int
    removed_stale: int
