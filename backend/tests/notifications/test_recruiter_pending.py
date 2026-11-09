"""Admins are told when a recruiter verifies their email, the moment they can be approved."""

import pytest
from django.core import mail

from apps.accounts import tokens
from apps.notifications import services as notification_services
from apps.notifications.models import Delivery, Kind, Notification
from tests.factories import AdminFactory, JobSeekerFactory, RecruiterFactory

pytestmark = pytest.mark.django_db

VERIFY = "/api/v1/auth/email/verify"


def verify(api_client, user):
    return api_client.post(VERIFY, {"token": tokens.make_email_token(user)})


def waiting_recruiter(**kwargs):
    return RecruiterFactory(
        profile__approval_status="pending",
        profile__company__name="Savanna Fintech",
        profile__job_title="Engineering manager",
        email_verified_at=None,
        full_name="Grace Mwangi",
        **kwargs,
    )


def test_verifying_notifies_every_active_admin(api_client, django_capture_on_commit_callbacks):
    first, second = AdminFactory(), AdminFactory()
    inactive = AdminFactory(is_active=False)
    recruiter = waiting_recruiter()

    with django_capture_on_commit_callbacks(execute=True):
        assert verify(api_client, recruiter).status_code == 200

    notes = Notification.objects.filter(kind=Kind.RECRUITER_PENDING)
    assert {n.user for n in notes} == {first, second}
    assert not Notification.objects.filter(user=inactive).exists()
    note = notes.get(user=first)
    assert note.title == "Grace Mwangi from Savanna Fintech is waiting for approval"
    assert "Engineering manager" in note.body
    assert note.link_path == "/admin/recruiters"
    # Admins also get the email (operational, so on by default), to their own address.
    assert sorted(m.to[0] for m in mail.outbox if "waiting for approval" in m.subject) == sorted(
        [first.email, second.email]
    )
    assert Delivery.objects.filter(notification=note, channel="email", status="sent").exists()


def test_verifying_twice_does_not_notify_again(api_client, django_capture_on_commit_callbacks):
    AdminFactory()
    recruiter = waiting_recruiter()
    with django_capture_on_commit_callbacks(execute=True):
        verify(api_client, recruiter)
        verify(api_client, recruiter)
    assert Notification.objects.filter(kind=Kind.RECRUITER_PENDING).count() == 1


def test_job_seekers_do_not_trigger_it(api_client, django_capture_on_commit_callbacks):
    AdminFactory()
    seeker = JobSeekerFactory(email_verified_at=None)
    with django_capture_on_commit_callbacks(execute=True):
        verify(api_client, seeker)
    assert not Notification.objects.filter(kind=Kind.RECRUITER_PENDING).exists()


@pytest.mark.parametrize("status", ["approved", "rejected", "suspended"])
def test_only_pending_recruiters_trigger_it(api_client, django_capture_on_commit_callbacks, status):
    AdminFactory()
    recruiter = RecruiterFactory(profile__approval_status=status, email_verified_at=None)
    with django_capture_on_commit_callbacks(execute=True):
        verify(api_client, recruiter)
    assert not Notification.objects.filter(kind=Kind.RECRUITER_PENDING).exists()


def test_signing_up_alone_does_not_notify(api_client, django_capture_on_commit_callbacks):
    """Approval needs a verified email, so a sign-up that hasn't verified yet isn't actionable."""
    AdminFactory()
    with django_capture_on_commit_callbacks(execute=True):
        response = api_client.post(
            "/api/v1/auth/register",
            {
                "role": "recruiter",
                "fullName": "Grace Mwangi",
                "email": "grace@savanna.test",
                "password": "correct-horse-battery-1",
                "companyName": "Savanna Fintech",
                "consents": {"terms": True, "emailFeedback": False, "smsFeedback": False},
            },
            format="json",
        )
    assert response.status_code == 201, response.json()
    assert not Notification.objects.filter(kind=Kind.RECRUITER_PENDING).exists()


def test_an_admin_can_turn_the_email_off(api_client, django_capture_on_commit_callbacks):
    admin = AdminFactory()
    matrix = notification_services.matrix(admin)
    assert matrix["recruiter_pending"] == {"in_app": True, "email": True}
    admin.notification_preferences.filter(kind=Kind.RECRUITER_PENDING, channel="email").update(
        enabled=False
    )
    recruiter = waiting_recruiter()

    with django_capture_on_commit_callbacks(execute=True):
        verify(api_client, recruiter)

    note = Notification.objects.get(user=admin, kind=Kind.RECRUITER_PENDING)  # still in the bell
    assert Delivery.objects.get(notification=note, channel="email").status == "skipped"
    assert not [m for m in mail.outbox if m.to == [admin.email]]
