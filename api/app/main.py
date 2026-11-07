"""Application factory. Run with `uvicorn --factory app.main:create_app`."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import Engine
from sqlalchemy.exc import IntegrityError

from app.auth.dev import router as dev_login_router
from app.auth.google import GoogleOAuthClient, IdentityProvider
from app.auth.router import router as auth_router
from app.boards.router import router as boards_router
from app.card_types.router import router as card_types_router
from app.cards.router import router as cards_router
from app.columns.router import router as columns_router
from app.config import Settings
from app.db import make_engine, make_sessionmaker

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_HEADER = "X-CSRF"


def create_app(
    settings: Settings | None = None,
    identity_provider: IdentityProvider | None = None,
    engine: Engine | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    app = FastAPI(title="Kambi API", version="0.1.0")
    app.state.settings = settings
    app.state.engine = engine or make_engine(settings.database_url)
    app.state.sessionmaker = make_sessionmaker(app.state.engine)
    app.state.identity_provider = identity_provider or GoogleOAuthClient(
        settings.google_client_id, settings.google_client_secret, settings.oauth_redirect_uri
    )
    app.middleware("http")(require_csrf_header)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    for router in (auth_router, boards_router, columns_router, card_types_router, cards_router):
        app.include_router(router)
    if settings.dev_login:
        app.include_router(dev_login_router)
    return app


async def require_csrf_header(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Reject mutations without `X-CSRF: 1`: a cross-site form cannot set that header."""
    if request.method in MUTATING_METHODS and request.headers.get(CSRF_HEADER) != "1":
        return JSONResponse(
            {"detail": f"Missing {CSRF_HEADER}: 1 header"}, status_code=status.HTTP_403_FORBIDDEN
        )
    return await call_next(request)


async def integrity_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """A concurrent request won a uniqueness race: report it like a validation error."""
    return JSONResponse(
        {"detail": "The change conflicts with existing data"},
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    )
