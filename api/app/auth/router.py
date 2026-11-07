"""Login, callback, logout and /me."""

import hmac
import uuid

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict

from app.auth import sessions
from app.auth.dependencies import CurrentUser, DbSession
from app.auth.google import IdentityError, IdentityProvider
from app.config import Settings

router = APIRouter(prefix="/api", tags=["auth"])


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _provider(request: Request) -> IdentityProvider:
    return request.app.state.identity_provider


def _login_failed(reason: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, f"Login failed: {reason}")


@router.get("/auth/login", status_code=status.HTTP_302_FOUND)
def login(request: Request) -> RedirectResponse:
    settings = _settings(request)
    state, nonce = sessions.new_login_challenge()
    response = RedirectResponse(_provider(request).authorization_url(state, nonce), 302)
    response.set_cookie(
        sessions.OAUTH_COOKIE,
        sessions.sign_challenge(settings.session_secret, state, nonce),
        max_age=sessions.OAUTH_COOKIE_MAX_AGE,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )
    return response


@router.get("/auth/callback", status_code=status.HTTP_302_FOUND)
def callback(request: Request, db: DbSession, code: str = "", state: str = "") -> RedirectResponse:
    settings = _settings(request)
    challenge = sessions.read_challenge(
        settings.session_secret, request.cookies.get(sessions.OAUTH_COOKIE)
    )
    if challenge is None or not code or not hmac.compare_digest(challenge[0], state):
        raise _login_failed("invalid state")
    try:
        identity = _provider(request).fetch_identity(code)
    except IdentityError as error:
        raise _login_failed(str(error)) from error
    if identity.nonce is None or not hmac.compare_digest(identity.nonce, challenge[1]):
        raise _login_failed("invalid nonce")

    user = sessions.upsert_user(db, identity)
    token = sessions.open_session(db, user)
    response = RedirectResponse("/", 302)
    response.delete_cookie(sessions.OAUTH_COOKIE, path="/api/auth")
    response.set_cookie(
        sessions.SESSION_COOKIE,
        token,
        max_age=int(sessions.SESSION_LIFETIME.total_seconds()),
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )
    return response


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: DbSession) -> Response:
    token = request.cookies.get(sessions.SESSION_COOKIE)
    if token:
        sessions.close_session(db, token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(sessions.SESSION_COOKIE, path="/")
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
