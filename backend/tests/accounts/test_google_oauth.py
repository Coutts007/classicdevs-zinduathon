from urllib.parse import parse_qs, urlparse

import pytest
import responses

from apps.accounts import github_oauth, google_oauth
from apps.accounts.models import ConsentRecord, GoogleAccount, User
from apps.core.models import AuditLog
from tests.factories import (
    PASSWORD,
    GithubAccountFactory,
    JobSeekerFactory,
    RecruiterFactory,
    UserFactory,
)

pytestmark = pytest.mark.django_db

CALLBACK = "/api/v1/auth/google/callback"
AUTHORIZE = "/api/v1/auth/google/authorize"
UNLINK = "/api/v1/auth/google"
G_TOKEN = "ya29.google_secret_access_token"


def mock_google(
    *, sub="109876543210", email="wanjiru@example.com", verified=True, token_error=False
):
    if token_error:
        responses.post(google_oauth.TOKEN_URL, json={"error": "invalid_grant"}, status=400)
    else:
        responses.post(
            google_oauth.TOKEN_URL,
            json={"access_token": G_TOKEN, "expires_in": 3599, "token_type": "Bearer"},
        )
    responses.get(
        google_oauth.USERINFO_URL,
        json={"sub": sub, "name": "Wanjiru Kamau", "email": email, "email_verified": verified},
    )


def state(**kwargs):
    kwargs.setdefault("consents", {"terms": True, "email_feedback": True, "sms_feedback": False})
    return google_oauth.make_state(google_oauth.OAuthState(**kwargs))


class TestAuthorize:
    def test_returns_a_google_url_with_signed_state(self, api_client):
        body = api_client.get(AUTHORIZE, {"acceptTerms": "true"}).json()

        url = urlparse(body["authorizeUrl"])
        query = parse_qs(url.query)
        assert url.netloc == "accounts.google.com"
        assert query["client_id"] == ["test-google-client-id"]
        assert query["redirect_uri"] == ["http://localhost:3000/auth/google/callback"]
        assert query["response_type"] == ["code"]
        assert query["scope"] == ["openid email profile"]
        assert query["prompt"] == ["select_account"]
        assert query["state"] == [body["state"]]
        assert google_oauth.read_state(body["state"]).consents["terms"] is True

    def test_without_config(self, api_client, settings):
        settings.GOOGLE_OAUTH_CLIENT_ID = ""
        response = api_client.get(AUTHORIZE)
        assert response.status_code == 503
        assert response.json()["code"] == "google_not_configured"


class TestSignIn:
    @responses.activate
    def test_new_user_is_created_as_verified_job_seeker(
        self, api_client, mailoutbox, django_capture_on_commit_callbacks
    ):
        mock_google()
        with django_capture_on_commit_callbacks(execute=True):
            response = api_client.post(CALLBACK, {"code": "abc", "state": state()})

        assert response.status_code == 200, response.json()
        body = response.json()
        assert body["created"] is True
        assert body["user"]["role"] == "job_seeker"
        assert body["user"]["email"] == "wanjiru@example.com"
        assert body["user"]["emailVerified"] is True
        assert body["user"]["hasPassword"] is False
        assert body["user"]["github"] is None
        assert body["user"]["google"]["email"] == "wanjiru@example.com"
        account = GoogleAccount.objects.get(google_sub="109876543210")
        assert not hasattr(account, "access_token_encrypted")  # no Google token is kept
        assert ConsentRecord.objects.filter(
            user=account.user, consent_type="terms", granted=True
        ).exists()
        assert AuditLog.objects.filter(
            action="auth.register", actor=account.user, metadata__via="google"
        ).exists()
        assert [m.subject for m in mailoutbox] == ["Welcome to SkillProof"]
        # The token exchange sent the secret, the code and the same redirect URI.
        sent = responses.calls[0].request.body
        assert "client_secret=test-google-client-secret" in sent
        assert "grant_type=authorization_code" in sent
        assert "redirect_uri=" in sent

    @responses.activate
    def test_known_google_account_signs_in_and_emails_the_owner(
        self, api_client, mailoutbox, django_capture_on_commit_callbacks
    ):
        user = JobSeekerFactory()
        GoogleAccount.objects.create(user=user, google_sub="109876543210", email=user.email)
        mock_google(email="changed@example.com")
        with django_capture_on_commit_callbacks(execute=True):
            body = api_client.post(CALLBACK, {"code": "abc", "state": state()}).json()

        assert body["created"] is False
        assert body["user"]["id"] == str(user.public_id)
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [user.email]  # the account's address, not Google's new one
        assert mailoutbox[0].subject == "New Google sign-in to SkillProof"

    @responses.activate
    def test_links_by_verified_email_to_existing_user(self, api_client):
        user = JobSeekerFactory(email="wanjiru@example.com")
        mock_google()

        body = api_client.post(CALLBACK, {"code": "abc", "state": state()}).json()

        assert body["created"] is False
        assert body["user"]["id"] == str(user.public_id)
        assert GoogleAccount.objects.get(user=user).google_sub == "109876543210"
        user.refresh_from_db()
        assert user.check_password(PASSWORD)  # a verified account keeps its password

    @responses.activate
    def test_email_match_on_unverified_account_drops_the_squatters_password(self, api_client):
        user = UserFactory(email="wanjiru@example.com", email_verified_at=None)
        user.set_password("squatter-password-1")
        user.save()
        mock_google()

        api_client.post(CALLBACK, {"code": "abc", "state": state()})

        user.refresh_from_db()
        assert not user.has_usable_password()
        assert user.is_email_verified

    @responses.activate
    def test_links_to_signed_in_user_without_emailing(
        self, auth_client, mailoutbox, django_capture_on_commit_callbacks
    ):
        user = JobSeekerFactory(email="different@example.com")
        mock_google()
        with django_capture_on_commit_callbacks(execute=True):
            body = (
                auth_client(user).post(CALLBACK, {"code": "abc", "state": state(link=True)}).json()
            )

        assert body["user"]["id"] == str(user.public_id)
        assert body["user"]["google"]["email"] == "wanjiru@example.com"
        assert AuditLog.objects.filter(action="auth.google_linked", actor=user).exists()
        assert mailoutbox == []  # linking from settings is not a sign-in

    @responses.activate
    def test_signed_in_user_cannot_take_someone_elses_google(self, auth_client):
        other = JobSeekerFactory()
        GoogleAccount.objects.create(user=other, google_sub="109876543210", email=other.email)
        me = JobSeekerFactory()
        mock_google()

        response = auth_client(me).post(CALLBACK, {"code": "abc", "state": state(link=True)})

        assert response.status_code == 409
        assert response.json()["code"] == "google_already_linked"

    @responses.activate
    def test_signed_in_user_with_other_google_must_disconnect_first(self, auth_client):
        me = JobSeekerFactory()
        GoogleAccount.objects.create(user=me, google_sub="someone-else", email=me.email)
        mock_google()

        response = auth_client(me).post(CALLBACK, {"code": "abc", "state": state(link=True)})

        assert response.status_code == 409
        assert response.json()["code"] == "google_already_linked"

    @responses.activate
    def test_recruiters_cannot_sign_up_through_google(self, api_client):
        mock_google()
        response = api_client.post(CALLBACK, {"code": "abc", "state": state(role="recruiter")})
        assert response.status_code == 400
        assert response.json()["code"] == "recruiter_signup_requires_email"
        assert not User.objects.filter(email="wanjiru@example.com").exists()

    @responses.activate
    def test_recruiter_can_sign_in_with_a_linked_google_without_an_email(
        self, api_client, mailoutbox, django_capture_on_commit_callbacks
    ):
        recruiter = RecruiterFactory()
        GoogleAccount.objects.create(user=recruiter, google_sub="109876543210", email="r@x.com")
        mock_google()
        with django_capture_on_commit_callbacks(execute=True):
            response = api_client.post(CALLBACK, {"code": "abc", "state": state()})

        assert response.status_code == 200
        assert mailoutbox == []  # sign-in emails go to job seekers only

    @responses.activate
    def test_new_signup_without_terms(self, api_client):
        mock_google()
        response = api_client.post(CALLBACK, {"code": "abc", "state": state(consents={})})
        assert response.status_code == 400
        assert response.json()["code"] == "terms_required"

    @responses.activate
    def test_suspended_user_cannot_sign_in(self, api_client):
        user = JobSeekerFactory(is_active=False)
        GoogleAccount.objects.create(user=user, google_sub="109876543210", email=user.email)
        mock_google()
        response = api_client.post(CALLBACK, {"code": "abc", "state": state()})
        assert response.status_code == 401


class TestFailures:
    def test_bad_state(self, api_client):
        response = api_client.post(CALLBACK, {"code": "abc", "state": "garbage"})
        assert response.status_code == 400
        assert response.json()["code"] == "state_invalid"

    def test_a_github_state_is_not_accepted_by_the_google_callback(self, api_client):
        github_state = github_oauth.make_state(github_oauth.OAuthState())
        response = api_client.post(CALLBACK, {"code": "abc", "state": github_state})
        assert response.status_code == 400
        assert response.json()["code"] == "state_invalid"

    def test_expired_state(self, api_client, monkeypatch):
        monkeypatch.setattr(google_oauth, "STATE_MAX_AGE", -1)
        response = api_client.post(CALLBACK, {"code": "abc", "state": state()})
        assert response.status_code == 400
        assert response.json()["code"] == "state_invalid"

    @responses.activate
    def test_bad_code(self, api_client):
        mock_google(token_error=True)
        response = api_client.post(CALLBACK, {"code": "used", "state": state()})
        assert response.status_code == 400
        assert response.json()["code"] == "google_oauth_failed"

    @responses.activate
    def test_google_down(self, api_client):
        import requests

        responses.post(google_oauth.TOKEN_URL, body=requests.ConnectionError("down"))
        response = api_client.post(CALLBACK, {"code": "abc", "state": state()})
        assert response.status_code == 400
        assert response.json()["code"] == "google_oauth_failed"

    @responses.activate
    def test_unverified_google_email(self, api_client):
        mock_google(verified=False)
        response = api_client.post(CALLBACK, {"code": "abc", "state": state()})
        assert response.status_code == 400
        assert response.json()["code"] == "google_email_unverified"
        assert not GoogleAccount.objects.exists()

    def test_without_config(self, api_client, settings):
        settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
        response = api_client.post(CALLBACK, {"code": "abc", "state": state()})
        assert response.status_code == 503
        assert response.json()["code"] == "google_not_configured"


class TestDisconnect:
    def test_allowed_with_a_password(self, auth_client):
        user = JobSeekerFactory()
        GoogleAccount.objects.create(user=user, google_sub="g1", email=user.email)
        assert auth_client(user).delete(UNLINK).status_code == 204
        assert not GoogleAccount.objects.filter(user=user).exists()
        assert AuditLog.objects.filter(action="auth.google_unlinked", actor=user).exists()

    def test_refused_when_it_is_the_only_way_in(self, auth_client):
        user = JobSeekerFactory()
        user.set_unusable_password()
        user.save()
        GoogleAccount.objects.create(user=user, google_sub="g1", email=user.email)

        response = auth_client(user).delete(UNLINK)

        assert response.status_code == 409
        assert response.json()["code"] == "password_required"
        assert GoogleAccount.objects.filter(user=user).exists()

    def test_allowed_when_github_is_linked(self, auth_client):
        user = JobSeekerFactory()
        user.set_unusable_password()
        user.save()
        GithubAccountFactory(user=user)
        GoogleAccount.objects.create(user=user, google_sub="g1", email=user.email)
        assert auth_client(user).delete(UNLINK).status_code == 204

    def test_nothing_linked(self, auth_client):
        response = auth_client(JobSeekerFactory()).delete(UNLINK)
        assert response.status_code == 400
        assert response.json()["code"] == "google_not_linked"

    def test_github_can_be_unlinked_when_google_remains(self, auth_client):
        user = JobSeekerFactory()
        user.set_unusable_password()
        user.save()
        GithubAccountFactory(user=user)
        GoogleAccount.objects.create(user=user, google_sub="g1", email=user.email)
        assert auth_client(user).delete("/api/v1/auth/github").status_code == 204

    def test_github_still_refused_when_it_is_the_only_way_in(self, auth_client):
        user = JobSeekerFactory()
        user.set_unusable_password()
        user.save()
        GithubAccountFactory(user=user)
        assert auth_client(user).delete("/api/v1/auth/github").status_code == 409


@responses.activate
def test_a_google_only_user_can_delete_their_account_after_signing_in(api_client):
    mock_google()
    body = api_client.post(CALLBACK, {"code": "abc", "state": state()}).json()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")

    response = api_client.delete("/api/v1/me", {}, format="json")

    assert response.status_code == 204
    assert not User.objects.filter(email="wanjiru@example.com").exists()


def test_export_includes_the_google_account(auth_client):
    user = JobSeekerFactory()
    GoogleAccount.objects.create(user=user, google_sub="g1", email="me@example.com")
    data = auth_client(user).get("/api/v1/me/export").json()
    assert data["google"]["email"] == "me@example.com"
    assert "g1" not in str(data)  # Google's internal id is not part of the export
