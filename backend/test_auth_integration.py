import os
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set a test-only JWT secret before importing the application.
os.environ["MABLYTIC_JWT_SECRET"] = "isolated-test-secret-not-for-production"

import auth
import main
import models
from database import Base, get_db


class AuthIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestSession = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=cls.engine,
        )
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestSession()
            try:
                yield db
            finally:
                db.close()

        main.app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(main.app)

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        main.app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def register_payload(self, **overrides):
        payload = {
            "username": "testuser123",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser123@example.invalid",
            "gender": "prefer-not-to-say",
            "age": 25,
            "preferences": "tech,gaming",
        }
        payload.update(overrides)
        return payload

    def create_test_user(self, username, is_admin=False):
        with self.TestSession() as db:
            user = models.User(
                username=username,
                password_hash=auth.hash_password("TestPass123!"),
                first_name="Test",
                last_name="User",
                email=f"{username}@example.invalid",
                gender="prefer-not-to-say",
                age=25,
                preferences="tech,gaming",
                is_admin=is_admin,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            user_id = user.id

        # Return a real token generated for this isolated test user.
        with self.TestSession() as db:
            user = db.query(models.User).filter_by(id=user_id).one()
            token = auth.create_access_token(user)

        return user_id, token

    def create_test_ad(self):
        with self.TestSession() as db:
            ad = models.Ad(
                title="Test Advertisement",
                content="Test content",
                category="tech",
                variant="A",
                image_url="",
            )
            db.add(ad)
            db.commit()
            db.refresh(ad)
            return ad.id

    def test_registration_stores_argon2_hash(self):
        response = self.client.post(
            "/auth/register",
            json=self.register_payload(),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn("password_hash", response.json())

        with self.TestSession() as db:
            user = db.query(models.User).filter_by(username="testuser123").one()
            self.assertTrue(user.password_hash.startswith("$argon2id$"))
            self.assertFalse(user.is_admin)

    def test_login_returns_token_and_user(self):
        self.client.post("/auth/register", json=self.register_payload())

        response = self.client.post(
            "/auth/login",
            json={
                "username": "testuser123",
                "password": "TestPass123!",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)

        body = response.json()
        self.assertTrue(body.get("access_token"))
        self.assertEqual(body.get("token_type"), "bearer")
        self.assertEqual(body.get("username"), "testuser123")
        self.assertTrue(body.get("id"))
        self.assertIn("is_admin", body)
        self.assertIn("preferences", body)

    def test_wrong_password_is_rejected(self):
        self.client.post("/auth/register", json=self.register_payload())

        response = self.client.post(
            "/auth/login",
            json={
                "username": "testuser123",
                "password": "WrongPass123!",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_duplicate_username_is_rejected(self):
        self.client.post("/auth/register", json=self.register_payload())

        response = self.client.post(
            "/auth/register",
            json=self.register_payload(email="another@example.invalid"),
        )
        self.assertEqual(response.status_code, 409)

    def test_duplicate_email_is_rejected(self):
        self.client.post("/auth/register", json=self.register_payload())

        response = self.client.post(
            "/auth/register",
            json=self.register_payload(username="anotheruser123"),
        )
        self.assertEqual(response.status_code, 409)

    def test_short_password_is_rejected(self):
        response = self.client.post(
            "/auth/register",
            json=self.register_payload(password="12345"),
        )
        self.assertEqual(response.status_code, 400)

    def test_six_character_password_is_accepted(self):
        response = self.client.post(
            "/auth/register",
            json=self.register_payload(password="Ab123!"),
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_registration_never_grants_admin(self):
        response = self.client.post(
            "/auth/register",
            json=self.register_payload(),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["is_admin"])

    def test_admin_endpoint_requires_authentication(self):
        response = self.client.get("/admin/dashboard-stats")
        self.assertEqual(response.status_code, 401)

    def test_regular_user_cannot_access_admin_endpoint(self):
        _, token = self.create_test_user("regularuser")

        response = self.client.get(
            "/admin/dashboard-stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_user_cannot_access_another_users_profile(self):
        first_id, first_token = self.create_test_user("profileuser1")
        second_id, _ = self.create_test_user("profileuser2")

        response = self.client.get(
            f"/auth/profile/{second_id}",
            headers={"Authorization": f"Bearer {first_token}"},
        )
        self.assertNotEqual(first_id, second_id)
        self.assertEqual(response.status_code, 403)

    def test_user_cannot_request_another_users_ad(self):
        first_id, first_token = self.create_test_user("aduser1")
        second_id, _ = self.create_test_user("aduser2")

        response = self.client.get(
            f"/serve-ad/{second_id}",
            headers={"Authorization": f"Bearer {first_token}"},
        )
        self.assertNotEqual(first_id, second_id)
        self.assertEqual(response.status_code, 403)

    def test_user_cannot_log_interaction_for_another_user(self):
        first_id, first_token = self.create_test_user("interactionuser1")
        second_id, _ = self.create_test_user("interactionuser2")
        ad_id = self.create_test_ad()

        response = self.client.post(
            "/interactions/",
            headers={"Authorization": f"Bearer {first_token}"},
            json={
                "user_id": second_id,
                "ad_id": ad_id,
                "interaction_type": "click",
            },
        )
        self.assertNotEqual(first_id, second_id)
        self.assertEqual(response.status_code, 403)

    def test_user_can_log_own_interaction(self):
        user_id, token = self.create_test_user("interactionowner")
        ad_id = self.create_test_ad()

        response = self.client.post(
            "/interactions/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "user_id": user_id,
                "ad_id": ad_id,
                "interaction_type": "view",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user_id"], user_id)
        self.assertEqual(response.json()["interaction_type"], "view")

    def test_interaction_listing_requires_admin(self):
        _, token = self.create_test_user("interactionreader")

        anonymous_response = self.client.get("/interactions/")
        self.assertEqual(anonymous_response.status_code, 401)

        user_response = self.client.get(
            "/interactions/",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(user_response.status_code, 403)


if __name__ == "__main__":
    unittest.main(verbosity=2)
