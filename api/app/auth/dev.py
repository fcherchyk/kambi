"""Development login for the offline sandbox: no Google, a fixed local user.

Only mounted when `DEV_LOGIN=true` (see `run-sandbox.sh`), and only answers loopback clients.
"""

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.auth import sessions
from app.auth.dependencies import DbSession
from app.auth.google import GoogleIdentity
from app.auth.router import session_redirect

router = APIRouter(prefix="/api", tags=["auth"], include_in_schema=False)

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}
DEV_IDENTITY = GoogleIdentity(
    sub="dev-login", email="dev@localhost", name="Dev User", picture=None, nonce=None
)


@router.get("/auth/dev-login", status_code=status.HTTP_302_FOUND)
def dev_login(request: Request, db: DbSession) -> RedirectResponse:
    host = request.client.host if request.client else ""
    if host not in LOOPBACK_HOSTS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Dev login only works from localhost")
    user = sessions.upsert_user(db, DEV_IDENTITY)
    token = sessions.open_session(db, user)
    return session_redirect(request.app.state.settings, token)
