from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name    = Column(String, default="")
    last_name     = Column(String, default="")
    email         = Column(String, unique=True, default="")
    gender        = Column(String, default="")      # male / female / non-binary / prefer-not-to-say
    age           = Column(Integer, default=0)
    preferences   = Column(String, default="")      # comma-separated e.g. "tech,gaming"
    is_admin      = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    interactions  = relationship("Interaction", back_populates="user")
    push_subscriptions = relationship("PushSubscription", back_populates="user")


class Ad(Base):
    __tablename__ = "ads"

    id        = Column(Integer, primary_key=True, index=True)
    title     = Column(String, index=True)
    content   = Column(String)
    category  = Column(String, index=True)   # e.g. "tech", "gaming"
    variant   = Column(String)               # "A" or "B" only — no C
    image_url = Column(String, default="")   # placeholder for future image support

    interactions = relationship("Interaction", back_populates="ad")


class Interaction(Base):
    __tablename__ = "interactions"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"))
    ad_id            = Column(Integer, ForeignKey("ads.id"))
    interaction_type = Column(String)        # "view" or "click"
    timestamp        = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interactions")
    ad   = relationship("Ad",   back_populates="interactions")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    endpoint   = Column(String, unique=True, index=True, nullable=False)
    p256dh     = Column(String, nullable=False)
    auth       = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="push_subscriptions")
