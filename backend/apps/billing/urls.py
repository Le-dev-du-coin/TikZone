from django.urls import path, re_path
from .superadmin_views import (
    SuperAdminAdjustWalletView,
    SuperAdminClientsView,
    SuperAdminPricingView,
    SuperAdminStatsView,
)
from .views import (
    DepositView,
    LigdiCashCallbackView,
    LigdiCashInitiateView,
    LigdiCashVerifyView,
    MyWalletView,
)

urlpatterns = [
    re_path(r"^wallet/?$", MyWalletView.as_view(), name="billing-wallet"),
    re_path(r"^deposit/?$", DepositView.as_view(), name="billing-deposit"),
    re_path(r"^ligdicash/initiate/?$", LigdiCashInitiateView.as_view(), name="billing-ligdicash-initiate"),
    re_path(r"^ligdicash/verify/?$", LigdiCashVerifyView.as_view(), name="billing-ligdicash-verify"),
    re_path(r"^ligdicash/callback/?$", LigdiCashCallbackView.as_view(), name="billing-ligdicash-callback"),
    re_path(r"^superadmin/stats/?$", SuperAdminStatsView.as_view(), name="superadmin-stats"),
    re_path(r"^superadmin/pricing/?$", SuperAdminPricingView.as_view(), name="superadmin-pricing"),
    re_path(r"^superadmin/clients/?$", SuperAdminClientsView.as_view(), name="superadmin-clients"),
    re_path(r"^superadmin/clients/(?P<user_id>[0-9a-f-]+)/adjust-wallet/?$", SuperAdminAdjustWalletView.as_view(), name="superadmin-adjust-wallet"),
]

