"""Session tokens, the signed OAuth state cookie and user upsert."""

import hashlib
import hmac
import secrets
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.google import GoogleIdentity
from app.auth.models import User, UserSession
from app.db import utcnow

SESSION_COOKIE = "kambi_session"
OAUTH_COOKIE = "kambi_oauth"
SESSION_LIFETIME = timedelta(days=30)
OAUTH_COOKIE_MAX_AGE = 600


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def open_session(db: Session, user: User) -> str:
    """Store a new session and return the raw token for the cookie."""
    token = secrets.token_urlsafe(32)
    db.add(
        UserSession(id=hash_token(token), user_id=user.id, expires_at=utcnow() + SESSION_LIFETIME)
    )
    return token


def user_for_token(db: Session, token: str) -> User | None:
    query = (
        select(User)
        .join(UserSession, UserSession.user_id == User.id)
        .where(UserSession.id == hash_token(token), UserSession.expires_at > utcnow())
    )
    return db.scalars(query).one_or_none()


def close_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.id == hash_token(token)))


def upsert_user(db: Session, identity: GoogleIdentity) -> User:
    user = db.scalars(select(User).where(User.google_sub == identity.sub)).one_or_none()
    if user is None:
        user = User(google_sub=identity.sub, settings={})
        db.add(user)
    user.email = identity.email
    user.name = identity.name
    user.avatar_url = identity.picture
    db.flush()
    return user


def new_login_challenge() -> tuple[str, str]:
    """Return a fresh (state, nonce) pair."""
    return secrets.token_urlsafe(32), secrets.token_urlsafe(32)


def sign_challenge(secret: str, state: str, nonce: str) -> str:
    return f"{state}.{nonce}.{_signature(secret, state, nonce)}"


def read_challenge(secret: str, cookie: str | None) -> tuple[str, str] | None:
    """Return (state, nonce) from a cookie value, or None if it is missing or forged."""
    parts = (cookie or "").split(".")
    if len(parts) != 3:
        return None
    state, nonce, signature = parts
    if not hmac.compare_digest(signature, _signature(secret, state, nonce)):
        return None
    return state, nonce


def _signature(secret: str, state: str, nonce: str) -> str:
    message = f"{state}.{nonce}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
