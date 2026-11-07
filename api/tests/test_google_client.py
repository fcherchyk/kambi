"""The real Google client, verified offline with a locally generated signing key."""

import time
import urllib.parse

import pytest
from joserfc import jwt
from joserfc.jwk import KeySet, RSAKey

from app.auth.google import (
    AUTHORIZE_URL,
    JWKS_URL,
    TOKEN_URL,
    GoogleOAuthClient,
    IdentityError,
)

CLIENT_ID = "client-123.apps.googleusercontent.com"


@pytest.fixture(scope="module")
def signing_key() -> RSAKey:
    return RSAKey.generate_key(2048, parameters={"kid": "test-key", "alg": "RS256"})


def id_token(key: RSAKey, **overrides: object) -> str:
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "g-123",
        "email": "ada@example.com",
        "name": "Ada",
        "picture": "https://example.com/ada.png",
        "nonce": "n-1",
        "exp": int(time.time()) + 300,
        "iat": int(time.time()),
    }
    claims.update(overrides)
    return jwt.encode({"alg": "RS256", "kid": "test-key"}, claims, key)


def client_returning(key: RSAKey, token: str | None) -> tuple[GoogleOAuthClient, list]:
    calls: list = []

    def fetch(url: str, form: dict[str, str] | None) -> dict:
        calls.append((url, form))
        if url == TOKEN_URL:
            return {"id_token": token} if token else {}
        if url == JWKS_URL:
            return KeySet([key]).as_dict(private=False)
        raise AssertionError(url)

    return GoogleOAuthClient(CLIENT_ID, "secret", "http://localhost/cb", fetch=fetch), calls


def test_S1_AC2_authorization_url_asks_for_minimal_scopes_with_state_and_nonce() -> None:
    client = GoogleOAuthClient(CLIENT_ID, "secret", "http://localhost:5174/api/auth/callback")

    url = client.authorization_url("s-1", "n-1")

    assert url.startswith(AUTHORIZE_URL)
    query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    assert query["scope"] == ["openid email profile"]
    assert query["state"] == ["s-1"]
    assert query["nonce"] == ["n-1"]
    assert query["redirect_uri"] == ["http://localhost:5174/api/auth/callback"]
    assert query["response_type"] == ["code"]


def test_S1_AC2_fetch_identity_exchanges_the_code_and_verifies_the_id_token(
    signing_key: RSAKey,
) -> None:
    client, calls = client_returning(signing_key, id_token(signing_key))

    identity = client.fetch_identity("the-code")

    assert identity.sub == "g-123"
    assert identity.email == "ada@example.com"
    assert identity.nonce == "n-1"
    assert calls[0][1]["code"] == "the-code"
    assert calls[0][1]["grant_type"] == "authorization_code"


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "someone-else"},
        {"iss": "https://evil.example.com"},
        {"exp": int(time.time()) - 60},
    ],
)
def test_S1_AC2_fetch_identity_rejects_invalid_claims(signing_key: RSAKey, overrides: dict) -> None:
    client, _ = client_returning(signing_key, id_token(signing_key, **overrides))

    with pytest.raises(IdentityError):
        client.fetch_identity("code")


def test_S1_AC2_fetch_identity_rejects_a_token_signed_with_another_key(signing_key: RSAKey) -> None:
    other = RSAKey.generate_key(2048, parameters={"kid": "test-key", "alg": "RS256"})
    client, _ = client_returning(signing_key, id_token(other))

    with pytest.raises(IdentityError):
        client.fetch_identity("code")


def test_S1_AC2_fetch_identity_without_id_token_fails(signing_key: RSAKey) -> None:
    client, _ = client_returning(signing_key, None)

    with pytest.raises(IdentityError):
        client.fetch_identity("code")


def test_S1_AC2_network_errors_become_identity_errors() -> None:
    def failing_fetch(url: str, form: dict[str, str] | None) -> dict:
        raise OSError("connection refused")

    client = GoogleOAuthClient(CLIENT_ID, "secret", "http://localhost/cb", fetch=failing_fetch)

    with pytest.raises(IdentityError):
        client.fetch_identity("code")
