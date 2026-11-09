"""Google sign-in (OpenID Connect, authorization-code flow) for a single-page app.

Same shape as the GitHub flow: the browser goes to Google with a signed `state`; Google sends it
back with a one-time `code`; the SPA posts both to us and we exchange the code server-side (the
client secret never reaches the browser). The identity is read from Google's userinfo endpoint with
the access token, so there is no ID-token signature to verify. We keep no Google tokens: they are
not needed after sign-in, and holding fewer credentials means fewer to protect.
"""

import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing

from .errors import GoogleEmailUnverified, GoogleNotConfigured, GoogleOAuthFailed, StateInvalid
from .github_oauth import OAuthState

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 - URL, not a secret
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
# Not GitHub's salt: a state minted for GitHub must not be accepted by the Google callback.
STATE_SALT = "skillproof.google-oauth-state"
STATE_MAX_AGE = 600
TIMEOUT = 10
SCOPES = "openid email profile"


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str  # Google's stable, unique id for the account (never reused)
    email: str | None  # only set when Google says the address is verified
    name: str | None


def ensure_configured() -> None:
    if not (settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET):
        raise GoogleNotConfigured()


def make_state(state: OAuthState) -> str:
    payload = {
        "r": state.role,
        "l": state.link,
        "c": state.consents,
        "n": secrets.token_urlsafe(8),  # makes every state unique
    }
    return signing.dumps(payload, salt=STATE_SALT, compress=True)


def read_state(value: str) -> OAuthState:
    try:
        data = signing.loads(value, salt=STATE_SALT, max_age=STATE_MAX_AGE)
    except signing.BadSignature as exc:
        raise StateInvalid() from exc
    return OAuthState(
        role=data.get("r", "job_seeker"), link=bool(data.get("l")), consents=data.get("c") or {}
    )


def authorize_url(state: str) -> str:
    ensure_configured()
    query = urlencode(
        {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "state": state,
            "prompt": "select_account",  # always offer the account chooser
        }
    )
    return f"{AUTHORIZE_URL}?{query}"


def exchange_code(code: str) -> GoogleIdentity:
    """Code → access token → profile (and whether Google verified the email)."""
    ensure_configured()
    try:
        response = requests.post(
            TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )
        data = response.json() if response.ok else {}
    except (requests.RequestException, ValueError) as exc:
        raise GoogleOAuthFailed("Could not reach Google. Try again.") from exc
    token = data.get("access_token")
    if not token:
        # e.g. {"error": "invalid_grant"}: the code was used or expired.
        raise GoogleOAuthFailed()

    try:
        profile_resp = requests.get(
            USERINFO_URL, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT
        )
        profile_resp.raise_for_status()
        profile = profile_resp.json()
        sub = str(profile["sub"])
    except (requests.RequestException, ValueError, KeyError) as exc:
        raise GoogleOAuthFailed("Could not read your Google profile. Try again.") from exc

    email = profile.get("email")
    verified = profile.get("email_verified") in (True, "true")
    return GoogleIdentity(
        sub=sub,
        email=email.lower() if email and verified else None,
        name=profile.get("name"),
    )


def require_email(identity: GoogleIdentity) -> str:
    if not identity.email:
        raise GoogleEmailUnverified()
    return identity.email
