"""Tests for the v4 API (articles, ad delivery rules, campaigns, admin guards).

Runs on a throwaway SQLite file by default; set TEST_DATABASE_URL for Postgres:
    cd backend && python -m pytest test_v4_api.py -q
"""

import os
import tempfile
import unittest
from datetime import UTC, datetime, timedelta

os.environ["MABLYTIC_JWT_SECRET"] = "isolated-test-secret-not-for-production"
_tmp = tempfile.mkdtemp()
# Set TEST_DATABASE_URL to run against Postgres (use an empty, throwaway database).
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import models  # noqa: E402
import seed_data  # noqa: E402
from database import SessionLocal  # noqa: E402


class V4ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_data.seed()
        seed_data.seed_content()
        cls.client = TestClient(main.app)

    def login(self, username, password):
        r = self.client.post("/auth/login", json={"username": username, "password": password})
        self.assertEqual(r.status_code, 200, r.text)
        return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()

    # ── seed volume ──────────────────────────────────────────────────────────
    def test_seed_volume_and_idempotence(self):
        db = SessionLocal()
        try:
            self.assertGreaterEqual(db.query(models.Article).count(), 60)
            self.assertGreaterEqual(db.query(models.Ad).count(), 20)
            before = (db.query(models.Article).count(), db.query(models.Ad).count())
        finally:
            db.close()
        seed_data.seed_content()
        db = SessionLocal()
        try:
            after = (db.query(models.Article).count(), db.query(models.Ad).count())
        finally:
            db.close()
        self.assertEqual(before, after)

    # ── public articles ──────────────────────────────────────────────────────
    def test_article_listing_and_filters(self):
        r = self.client.get("/articles?page_size=48")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertGreaterEqual(data["total"], 60)
        self.assertEqual(len(data["items"]), 48)
        self.assertNotIn("body", data["items"][0])

        cats = self.client.get("/articles/categories").json()
        self.assertGreaterEqual(len(cats), 10)
        self.assertTrue(all(c["count"] >= 5 for c in cats))

        r = self.client.get("/articles?category=sports")
        self.assertTrue(r.json()["items"] and all(i["category"] == "Sports" for i in r.json()["items"]))

        r = self.client.get("/articles?q=rail")
        self.assertGreaterEqual(r.json()["total"], 1)

    def test_sections_endpoint(self):
        data = self.client.get("/articles/sections?per_section=4").json()
        self.assertGreaterEqual(len(data), 10)
        for sec in data:
            self.assertLessEqual(len(sec["items"]), 4)
            self.assertTrue(all(i["category"] == sec["name"] for i in sec["items"]))

    def test_article_detail_and_missing(self):
        slug = self.client.get("/articles?page_size=1").json()["items"][0]["slug"]
        d = self.client.get(f"/articles/{slug}").json()
        self.assertGreaterEqual(len(d["body"].split("\n\n")), 8)
        self.assertTrue(d["is_demo"])
        self.assertEqual(self.client.get("/articles/does-not-exist").status_code, 404)

    def test_for_you_requires_auth_and_uses_preferences(self):
        self.assertEqual(self.client.get("/articles/for-you").status_code, 401)
        headers, _ = self.login("davidg", "Game12")  # gaming,sports
        items = self.client.get("/articles/for-you?page_size=48", headers=headers).json()["items"]
        self.assertTrue(items)
        self.assertTrue({i["category"] for i in items} <= {"Technology", "Arts", "Sports"})

    # ── ad delivery rules ────────────────────────────────────────────────────
    def test_public_ads_distinct_and_labelled_fields(self):
        ads = self.client.get("/public/ads?count=8").json()
        self.assertEqual(len(ads), 8)
        self.assertEqual(len({a["id"] for a in ads}), 8)
        self.assertEqual(self.client.get("/public/ads?placement=bogus").status_code, 422)

    def test_paused_and_scheduled_ads_are_not_served(self):
        admin_h, _ = self.login("admin", "Admin123")
        created = self.client.post(
            "/admin/ads",
            headers=admin_h,
            json={"title": "Test only", "content": "x", "category": "tech", "variant": "A",
                  "destination_url": "https://example.com/t", "status": "paused"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        ad_id = created.json()["id"]
        served = {a["id"] for a in self.client.get("/public/ads?count=12").json()}
        self.assertNotIn(ad_id, served)

        future = (datetime.now(UTC) + timedelta(days=5)).isoformat()
        r = self.client.put(f"/admin/ads/{ad_id}", headers=admin_h, json={"status": "active", "start_date": future})
        self.assertEqual(r.status_code, 200, r.text)
        for _ in range(5):
            self.assertNotIn(ad_id, {a["id"] for a in self.client.get("/public/ads?count=12").json()})

        r = self.client.put(f"/admin/ads/{ad_id}", headers=admin_h, json={"clear_schedule": True})
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["start_date"])

    def test_paused_campaign_blocks_its_ads(self):
        admin_h, _ = self.login("admin", "Admin123")
        camps = self.client.get("/admin/campaigns", headers=admin_h).json()
        paused = next(c for c in camps if c["status"] == "paused")
        db = SessionLocal()
        try:
            ad = db.query(models.Ad).filter(models.Ad.title == "Coursera Plus — Annual").first()
            ad.campaign_id = paused["id"]
            db.commit()
            ad_id = ad.id
        finally:
            db.close()
        for _ in range(5):
            self.assertNotIn(ad_id, {a["id"] for a in self.client.get("/public/ads?count=12").json()})

    def test_personalized_batch_prefers_user_categories(self):
        headers, user = self.login("alice", "Tech12")  # tech,gaming
        ads = self.client.get(f"/serve-ads/{user['id']}?count=2", headers=headers).json()
        self.assertEqual(len(ads), 2)
        self.assertTrue(all(a["category"] in ("tech", "gaming") for a in ads))
        self.assertEqual(self.client.get(f"/serve-ads/{user['id']+1}", headers=headers).status_code, 403)
        self.assertEqual(self.client.get(f"/serve-ads/{user['id']}").status_code, 401)

    def test_legacy_serve_ad_still_works(self):
        headers, user = self.login("alice", "Tech12")
        r = self.client.get(f"/serve-ad/{user['id']}", headers=headers)
        self.assertEqual(r.status_code, 200)
        self.assertIn(r.json()["category"], ("tech", "gaming"))

    # ── authorization ────────────────────────────────────────────────────────
    def test_admin_endpoints_reject_users_and_anonymous(self):
        user_h, _ = self.login("alice", "Tech12")
        for method, path in [
            ("get", "/admin/overview"), ("get", "/admin/campaigns"), ("get", "/admin/articles"),
            ("get", "/admin/targeting"), ("get", "/admin/users"), ("put", "/admin/users/1"),
            ("post", "/admin/articles"), ("delete", "/admin/articles/1"), ("put", "/admin/ads/1"),
        ]:
            anon = getattr(self.client, method)(path)
            self.assertEqual(anon.status_code, 401, path)
            forb = getattr(self.client, method)(path, headers=user_h)
            self.assertEqual(forb.status_code, 403, path)

    def test_admin_cannot_demote_self(self):
        admin_h, admin = self.login("admin", "Admin123")
        r = self.client.put(f"/admin/users/{admin['id']}", headers=admin_h, json={"is_admin": False})
        self.assertEqual(r.status_code, 400)

    def test_deactivated_user_cannot_log_in(self):
        admin_h, _ = self.login("admin", "Admin123")
        _, bob = self.login("bobfit", "Fit456")
        self.client.put(f"/admin/users/{bob['id']}", headers=admin_h, json={"is_active": False})
        r = self.client.post("/auth/login", json={"username": "bobfit", "password": "Fit456"})
        self.assertEqual(r.status_code, 403)
        self.client.put(f"/admin/users/{bob['id']}", headers=admin_h, json={"is_active": True})
        self.assertEqual(self.client.post("/auth/login", json={"username": "bobfit", "password": "Fit456"}).status_code, 200)

    # ── validation ───────────────────────────────────────────────────────────
    def test_ad_validation(self):
        admin_h, _ = self.login("admin", "Admin123")
        base = {"title": "T", "content": "c", "category": "tech", "variant": "A"}
        bad_url = self.client.post("/admin/ads", headers=admin_h, json={**base, "destination_url": "javascript:alert(1)"})
        self.assertEqual(bad_url.status_code, 422)
        bad_var = self.client.post("/admin/ads", headers=admin_h, json={**base, "variant": "C"})
        self.assertEqual(bad_var.status_code, 400)
        bad_dates = self.client.post("/admin/ads", headers=admin_h, json={**base, "start_date": "2026-05-02T00:00:00Z", "end_date": "2026-05-01T00:00:00Z"})
        self.assertEqual(bad_dates.status_code, 422)

    def test_campaign_crud_and_duplicate_name(self):
        h, _ = self.login("admin", "Admin123")
        r = self.client.post("/admin/campaigns", headers=h, json={"name": "Spring Sale", "budget": 500})
        self.assertEqual(r.status_code, 201, r.text)
        cid = r.json()["id"]
        self.assertEqual(self.client.post("/admin/campaigns", headers=h, json={"name": "Spring Sale"}).status_code, 409)
        self.assertEqual(self.client.put(f"/admin/campaigns/{cid}", headers=h, json={"status": "paused"}).json()["status"], "paused")
        self.assertEqual(self.client.put(f"/admin/campaigns/{cid}", headers=h, json={"status": "nope"}).status_code, 422)
        self.assertEqual(self.client.delete(f"/admin/campaigns/{cid}", headers=h).status_code, 200)

    def test_article_admin_crud(self):
        h, _ = self.login("admin", "Admin123")
        r = self.client.post("/admin/articles", headers=h, json={"title": "Draft Piece", "category": "World", "body": "a\n\nb", "status": "draft"})
        self.assertEqual(r.status_code, 201, r.text)
        art = r.json()
        self.assertEqual(self.client.get(f"/articles/{art['slug']}").status_code, 404)  # drafts hidden
        self.client.put(f"/admin/articles/{art['id']}", headers=h, json={"status": "published"})
        self.assertEqual(self.client.get(f"/articles/{art['slug']}").status_code, 200)
        dup = self.client.post("/admin/articles", headers=h, json={"title": "Draft Piece", "category": "World"}).json()
        self.assertNotEqual(dup["slug"], art["slug"])
        self.client.delete(f"/admin/articles/{dup['id']}", headers=h)
        self.assertEqual(self.client.delete(f"/admin/articles/{art['id']}", headers=h).status_code, 200)

    def test_overview_and_targeting_shapes(self):
        h, _ = self.login("admin", "Admin123")
        o = self.client.get("/admin/overview", headers=h).json()
        self.assertEqual(len(o["daily"]), 14)
        self.assertGreaterEqual(o["totals"]["published_articles"], 60)
        t = self.client.get("/admin/targeting", headers=h).json()
        self.assertEqual(len(t["categories"]), 9)
        self.assertIn("Age targeting", t["criteria"]["not_supported"])

    def test_preferences_update(self):
        h, _ = self.login("emmaed", "Book34")
        r = self.client.put("/auth/preferences", headers=h, json={"preferences": "books, travel"})
        self.assertEqual(r.json()["preferences"], "books,travel")
        self.assertEqual(self.client.put("/auth/preferences", headers=h, json={"preferences": "astrology"}).status_code, 422)
        self.client.put("/auth/preferences", headers=h, json={"preferences": "books,education"})

    def test_change_password(self):
        h, _ = self.login("carol", "Food78")
        self.assertEqual(self.client.post("/auth/change-password", headers=h, json={"current_password": "wrong", "new_password": "NewPass1"}).status_code, 401)
        self.assertEqual(self.client.post("/auth/change-password", headers=h, json={"current_password": "Food78", "new_password": "NewPass1"}).status_code, 200)
        self.assertEqual(self.client.post("/auth/login", json={"username": "carol", "password": "NewPass1"}).status_code, 200)
        h2, _ = self.login("carol", "NewPass1")
        self.client.post("/auth/change-password", headers=h2, json={"current_password": "NewPass1", "new_password": "Food78"})


if __name__ == "__main__":
    unittest.main()
