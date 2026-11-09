"""Local development: debug on, tasks run inline, email goes to Mailpit (or a real SMTP server if
EMAIL_HOST points at one), SMS is dry-run."""

from .base import *
from .env import env_bool, env_int, env_str

DEBUG = env_bool("DJANGO_DEBUG", True)
# A throwaway key so `make dev` works before anyone creates a .env. Never used outside dev.
SECRET_KEY = SECRET_KEY or "dev-only-insecure-key-change-me-0123456789-abcdefghijklmnop"
ALLOWED_HOSTS = [*ALLOWED_HOSTS, "0.0.0.0", "web"]  # noqa: S104 - docker-compose service name

CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", True)

# runserver serves each request on a new thread. With persistent connections each thread's
# connection outlives it, so a long e2e session exhausts Postgres ("too many clients").
DATABASES["default"]["CONN_MAX_AGE"] = env_int("DB_CONN_MAX_AGE", 0)

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env_str("EMAIL_HOST", "localhost")
EMAIL_PORT = env_int("EMAIL_PORT", 1025)
EMAIL_TIMEOUT = 10  # a dead SMTP server must not hang the request that triggered the email
# Mailpit takes any mail without a login, and Django would fail trying to authenticate against it,
# so credentials and TLS only apply when EMAIL_HOST is a real server (e.g. smtp.gmail.com:587 with
# an app password). The default stays Mailpit: nothing leaves the machine unless you opt in.
if EMAIL_HOST not in {"localhost", "127.0.0.1", "::1", "mailpit"}:
    EMAIL_HOST_USER = env_str("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = env_str("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
DEFAULT_FROM_EMAIL = env_str("DEFAULT_FROM_EMAIL", "SkillProof <no-reply@skillproof.app>")

LOGGING["handlers"]["console"]["formatter"] = env_str("LOG_FORMAT", "text")

# Serve static files from app directories without running collectstatic first.
WHITENOISE_AUTOREFRESH = True
WHITENOISE_USE_FINDERS = True

# Dev conveniences (see docs/DECISIONS.md D-011/D-012). Production never sets these.
from apps.core.crypto import derive_dev_key  # noqa: E402

FIELD_ENCRYPTION_KEY = FIELD_ENCRYPTION_KEY or derive_dev_key(SECRET_KEY)
GITHUB_DEV_CALLBACK_ENABLED = env_bool("GITHUB_DEV_CALLBACK_ENABLED", True)
GITHUB_OAUTH_REDIRECT_URI = env_str(
    "GITHUB_OAUTH_REDIRECT_URI", "http://localhost:8000/api/v1/auth/github/dev-callback"
)
SMS_DEV_ECHO_CODES = SMS_DRY_RUN
