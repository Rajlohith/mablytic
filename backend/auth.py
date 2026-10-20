import os
from datetime import UTC, datetime, timedelta

import jwt
import models
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from database import get_db
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

# Configure these through environment variables in production.
JWT_SECRET = os.getenv("MABLYTIC_JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30

if not JWT_SECRET:
    raise RuntimeError("MABLYTIC_JWT_SECRET must be set before starting the backend.")

password_hasher = PasswordHasher()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a new password using Argon2id."""
    return password_hasher.hash(password)


def verify_argon2_password(password: str, stored_hash: str) -> bool:
    """Verify an Argon2 password hash safely."""
    try:
        return password_hasher.verify(stored_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(user: models.User) -> str:
    """Create a short-lived token for an authenticated user."""
    now = datetime.now(UTC)

    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Resolve the authenticated user from a verified bearer token."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required or token is invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise unauthorized

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        raise unauthorized

    return user


def require_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Reject authenticated users who do not have the admin role."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required.",
        )

    return current_user


import hashlib

LEGACY_SALTS = ("mablytic_salt_v1", "adwise_salt_v1")


def verify_and_upgrade_password(
    password: str,
    stored_hash: str,
) -> tuple[bool, str | None]:
    """
    Verify an Argon2id or legacy SHA-256 hash.

    Returns:
        (valid, replacement_hash)
        replacement_hash is None when no upgrade is needed.
    """
    if stored_hash.startswith("$argon2"):
        valid = verify_argon2_password(password, stored_hash)
        if not valid:
            return False, None

        if password_hasher.check_needs_rehash(stored_hash):
            return True, hash_password(password)

        return True, None

    # Legacy SHA-256 hashes used a fixed salt followed by the password.
    for salt in LEGACY_SALTS:
        candidate = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

        if __import__("hmac").compare_digest(candidate, stored_hash):
            return True, hash_password(password)

    return False, None
