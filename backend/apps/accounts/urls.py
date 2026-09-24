from django.urls import re_path
from .views import (
    ChangePasswordView,
    DeleteAccountView,
    LoginView,
    LogoutView,
    MeView,
    RegisterConfirmView,
    RegisterInitView,
    RegisterResendOTPView,
    RegisterView,
)

urlpatterns = [
    re_path(r"^register/?$", RegisterView.as_view(), name="account-register"),
    re_path(r"^register/init/?$", RegisterInitView.as_view(), name="account-register-init"),
    re_path(r"^register/confirm/?$", RegisterConfirmView.as_view(), name="account-register-confirm"),
    re_path(r"^register/resend/?$", RegisterResendOTPView.as_view(), name="account-register-resend"),
    re_path(r"^login/?$", LoginView.as_view(), name="account-login"),
    re_path(r"^logout/?$", LogoutView.as_view(), name="account-logout"),
    re_path(r"^me/?$", MeView.as_view(), name="account-me"),
    re_path(r"^change-password/?$", ChangePasswordView.as_view(), name="account-change-password"),
    re_path(r"^delete-account/?$", DeleteAccountView.as_view(), name="account-delete-account"),
]
