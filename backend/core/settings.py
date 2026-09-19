"""
Django settings for Mikroot SaaS project.
Configured with python-decouple for strict environment separation.
"""
from pathlib import Path
from decouple import Csv, config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config(
    "SECRET_KEY",
    default="django-insecure-dev-key-change-in-production-mikroot",
)

DEBUG = config("DEBUG", default=True, cast=bool)

DJANGO_ADMIN_URL = config("DJANGO_ADMIN_URL", default="super-manager-panel-2026")

BASE_DOMAIN = config("BASE_DOMAIN", default="mikroot.app")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default=f"api.{BASE_DOMAIN},app.{BASE_DOMAIN},{BASE_DOMAIN},127.0.0.1,localhost,187.7.20.53",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
APPEND_SLASH = False

# Application definition
INSTALLED_APPS = [
    # Django Built-in
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party Apps
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # Local Apps (Mikroot modular architecture)
    "apps.accounts.apps.AccountsConfig",
    "apps.billing.apps.BillingConfig",
    "apps.instances.apps.InstancesConfig",
    "apps.routers.apps.RoutersConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # CORS en tout premier
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Database Configuration
DATABASE_URL = config("DATABASE_URL", default=None)

if DATABASE_URL:
    import urllib.parse
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql" if url.scheme in ("postgres", "postgresql") else "django.db.backends.sqlite3",
            "NAME": url.path.lstrip("/"),
            "USER": url.username,
            "PASSWORD": url.password,
            "HOST": url.hostname,
            "PORT": url.port or 5432,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "static_collected"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# CORS Configuration (Permissif en dev pour éviter tout blocage entre localhost et 127.0.0.1)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# Paramètres Métier TikZone / VPN
VPN_SERVER_HOST = config("VPN_SERVER_HOST", default="187.7.20.53")
MIKHMON_BASE_DOMAIN = config("MIKHMON_BASE_DOMAIN", default=BASE_DOMAIN)
VPN_SUBNET = config("VPN_SUBNET", default="172.29.88.0/24")
VPN_API_PORT_START = config("VPN_API_PORT_START", default=41000, cast=int)
VPN_WINBOX_PORT_START = config("VPN_WINBOX_PORT_START", default=51000, cast=int)
VPN_WG_SERVER_PORT = config("VPN_WG_SERVER_PORT", default=51820, cast=int)
VPN_WG_SERVER_PUBKEY = config(
    "VPN_WG_SERVER_PUBKEY",
    default="pUBL1cK3yM1kr00tS3rv3rVpnW1r3gu4rdD3m02026=",
)
VPN_SYNC_SECRET = config(
    "VPN_SYNC_SECRET",
    default="mikroot-vpn-sync-secret-token-2026",
)
PRICE_MIKHMON_INSTANCE_FCFA = 1000
PRICE_ROUTER_MONTHLY_FCFA = 500
