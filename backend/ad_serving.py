"""Ad serving logic using Thompson Sampling Bandit algorithm."""

import random
from sqlalchemy.orm import Session
from sqlalchemy import func
import models


def user_preference_categories(user: models.User) -> list[str]:
    """Extract and normalize user preference categories."""
    return [p.strip().lower() for p in (user.preferences or "").split(",") if p.strip()]


class ThompsonSamplingBandit:
    """A simple Thompson Sampling bandit for ad selection."""

    def __init__(self, db: Session):
        self.db = db

    def get_ad_stats(self, ad: models.Ad) -> tuple[int, int]:
        """Get view and click counts for an ad."""
        views = self.db.query(func.count(models.Interaction.id)).filter(
            models.Interaction.ad_id == ad.id,
            models.Interaction.interaction_type == "view"
        ).scalar() or 0
        clicks = self.db.query(func.count(models.Interaction.id)).filter(
            models.Interaction.ad_id == ad.id,
            models.Interaction.interaction_type == "click"
        ).scalar() or 0
        return views, clicks

    def score(self, ad: models.Ad) -> float:
        """Score an ad using Thompson Sampling."""
        views, clicks = self.get_ad_stats(ad)
        alpha = 1 + clicks
        beta = 1 + max(0, views - clicks)
        return random.betavariate(alpha, beta)

    def choose(self, ads: list[models.Ad]) -> models.Ad:
        """Select the best ad from a list using Thompson Sampling."""
        best_ad = None
        best_score = -1.0
        for ad in ads:
            score = self.score(ad)
            if score > best_score:
                best_score = score
                best_ad = ad
        return best_ad
