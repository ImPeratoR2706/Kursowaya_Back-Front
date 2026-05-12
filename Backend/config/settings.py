import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """
    Minimal .env loader (no external deps).
    Loads KEY=VALUE pairs into os.environ if missing.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if not key or key in os.environ:
            continue
        # Strip optional quotes
        if len(val) >= 2 and ((val[0] == val[-1] == '"') or (val[0] == val[-1] == "'")):
            val = val[1:-1]
        os.environ[key] = val


# Load env from project root and backend folder (if present)
_load_dotenv(BASE_DIR.parent / ".env")
_load_dotenv(BASE_DIR / ".env")
POSTGRES_BIN_DIR = Path(os.getenv("POSTGRES_BIN_DIR", r"C:\Program Files\PostgreSQL\18\bin"))

if POSTGRES_BIN_DIR.exists():
    os.environ["PATH"] = f"{POSTGRES_BIN_DIR}{os.pathsep}{os.environ.get('PATH', '')}"
    add_dll_directory = getattr(os, "add_dll_directory", None)
    if callable(add_dll_directory):
        add_dll_directory(str(POSTGRES_BIN_DIR))

SECRET_KEY = "django-insecure-dev-key-for-course-project"
DEBUG = os.getenv("DJANGO_DEBUG", "1").strip() not in {"0", "false", "False"}

_allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").strip()
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts.split(",") if h.strip()]
if "backend" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("backend")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "apps.users",
    "apps.salon",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Локально без PostgreSQL: в PowerShell перед migrate выполните
#   $env:USE_SQLITE = "1"
# или добавьте в .env в корне проекта / в Backend: USE_SQLITE=1
_use_sqlite = os.getenv("USE_SQLITE", "").strip().lower() in {"1", "true", "yes", "on"}

if _use_sqlite:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "hair_salon_db"),
            "USER": os.getenv("POSTGRES_USER", "postgres"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "rest_framework.schemas.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
]
_extra_cors = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if _extra_cors:
    CORS_ALLOWED_ORIGINS.extend([o.strip() for o in _extra_cors.split(",") if o.strip()])
CORS_ALLOW_CREDENTIALS = True
