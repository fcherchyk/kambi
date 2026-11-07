"""Google OpenID Connect behind a small interface, so tests can inject a fake."""

import json
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ["https://accounts.google.com", "accounts.google.com"]
SCOPES = "openid email profile"
HTTP_TIMEOUT_SECONDS = 10


class IdentityError(Exception):
    """The provider did not return a valid identity."""


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str
    picture: str | None
    nonce: str | None


class IdentityProvider(Protocol):
    def authorization_url(self, state: str, nonce: str) -> str: ...

    def fetch_identity(self, code: str) -> GoogleIdentity: ...


# (url, form data or None for GET) -> decoded JSON
JsonFetcher = Callable[[str, dict[str, str] | None], dict]


def fetch_json(url: str, form: dict[str, str] | None) -> dict:
    data = urllib.parse.urlencode(form).encode() if form is not None else None
    request = urllib.request.Request(url, data=data, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
        return json.loads(response.read())


class GoogleOAuthClient:
    """Server-side Authorization Code flow. Google tokens are never stored."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        fetch: JsonFetcher = fetch_json,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.fetch = fetch

    def authorization_url(self, state: str, nonce: str) -> str:
        query = urllib.parse.urlencode(
            {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": SCOPES,
                "state": state,
                "nonce": nonce,
                "prompt": "select_account",
            }
        )
        return f"{AUTHORIZE_URL}?{query}"

    def fetch_identity(self, code: str) -> GoogleIdentity:
        try:
            tokens = self.fetch(
                TOKEN_URL,
                {
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            keys = KeySet.import_key_set(self.fetch(JWKS_URL, None))
        except (OSError, ValueError, JoseError) as error:
            raise IdentityError(f"Google request failed: {error}") from error
        return self.verify_id_token(tokens.get("id_token", ""), keys)

    def verify_id_token(self, id_token: str, keys: KeySet) -> GoogleIdentity:
        if not id_token:
            raise IdentityError("Google returned no ID token")
        registry = jwt.JWTClaimsRegistry(
            iss={"essential": True, "values": ISSUERS},
            aud={"essential": True, "value": self.client_id},
            sub={"essential": True},
            exp={"essential": True},
        )
        try:
            claims = jwt.decode(id_token, keys, algorithms=["RS256"]).claims
            registry.validate(claims)
        except (JoseError, ValueError) as error:
            raise IdentityError(f"Invalid ID token: {error}") from error
        return GoogleIdentity(
            sub=str(claims["sub"]),
            email=str(claims.get("email", "")),
            name=str(claims.get("name", "")),
            picture=claims.get("picture"),
            nonce=claims.get("nonce"),
        )
