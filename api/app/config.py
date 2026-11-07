"""Application settings, read from environment variables."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

# Every environment variable the API reads. `.env.example` must list all of them.
ENV_VARS = (
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "SESSION_SECRET",
    "OAUTH_REDIRECT_URI",
    "COOKIE_SECURE",
    "DEV_LOGIN",
)

DEFAULT_REDIRECT_URI = "http://localhost:5174/api/auth/callback"


@dataclass(frozen=True)
class Settings:
    database_url: str
    google_client_id: str
    google_client_secret: str
    session_secret: str
    oauth_redirect_uri: str = DEFAULT_REDIRECT_URI
    cookie_secure: bool = False
    # Enables `/api/auth/dev-login` (offline sandbox only, see `run-sandbox.sh`).
    dev_login: bool = False

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        env = os.environ if env is None else env
        missing = [name for name in ENV_VARS[:4] if not env.get(name)]
        if missing:
            raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")
        return cls(
            database_url=env["DATABASE_URL"],
            google_client_id=env["GOOGLE_CLIENT_ID"],
            google_client_secret=env["GOOGLE_CLIENT_SECRET"],
            session_secret=env["SESSION_SECRET"],
            oauth_redirect_uri=env.get("OAUTH_REDIRECT_URI") or DEFAULT_REDIRECT_URI,
            cookie_secure=parse_bool(env.get("COOKIE_SECURE", "")),
            dev_login=parse_bool(env.get("DEV_LOGIN", "")),
        )


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}
