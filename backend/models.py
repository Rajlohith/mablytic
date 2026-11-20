from database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, default="")
    last_name = Column(String, default="")
    email = Column(String, unique=True, default="")
    gender = Column(
        String, default=""
    )  # male / female / non-binary / prefer-not-to-say
    age = Column(Integer, default=0)
    preferences = Column(String, default="")  # comma-separated e.g. "tech,gaming"
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # account status (added in v4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interactions = relationship("Interaction", back_populates="user")


class Campaign(Base):
    """A grouping of ads with a schedule and optional budget (added in v4)."""

    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="active")  # active / paused / draft / ended
    budget = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ads = relationship("Ad", back_populates="campaign")


class Ad(Base):
    __tablename__ = "ads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String, index=True)  # e.g. "tech", "gaming"
    variant = Column(String)  # "A" or "B" only — no C
    image_url = Column(String, default="")

    # ── Added in v4 (all optional / defaulted so old rows stay valid) ─────────
    advertiser = Column(String, default="")
    destination_url = Column(String, default="")
    placement = Column(String, default="any")  # any / feed / sidebar / inline / banner
    status = Column(String, default="active")  # active / paused / draft
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)

    interactions = relationship("Interaction", back_populates="ad")
    campaign = relationship("Campaign", back_populates="ads")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ad_id = Column(Integer, ForeignKey("ads.id"))
    interaction_type = Column(String)  # "view" or "click"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interactions")
    ad = relationship("Ad", back_populates="interactions")


class Article(Base):
    """News article. Rows pulled from RSS/APIs have is_external=True and link back
    to the publisher via source_url; fictional demo rows (legacy) use is_demo=True."""

    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(String, default="")
    body = Column(Text, default="")  # paragraphs separated by blank lines
    category = Column(String, index=True, nullable=False)
    author = Column(String, default="")
    image_url = Column(String, default="")
    image_alt = Column(String, default="")
    image_credit = Column(String, default="")
    read_minutes = Column(Integer, default=4)
    is_featured = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    is_external = Column(Boolean, default=False)  # ingested from an RSS feed / news API
    source_name = Column(String, default="")  # e.g. "BBC News"
    source_url = Column(String, default="", index=True)  # canonical link to the original story
    status = Column(String, default="published")  # published / draft
    published_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
