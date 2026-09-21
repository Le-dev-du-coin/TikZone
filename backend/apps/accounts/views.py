from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            from apps.billing.models import Wallet
            Wallet.objects.get_or_create(user=user, defaults={"balance": Decimal("0.00")})
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get("email") or request.data.get("username", "")
        identifier = str(identifier).strip()
        password = request.data.get("password", "")

        user = None
        # 1. Tentative d'authentification standard (email)
        if "@" in identifier:
            user = authenticate(request, email=identifier.lower(), password=password)

        # 2. Si non trouvé ou identifiant sans @, chercher par username ou email
        if not user:
            from django.db.models import Q
            from .models import User
            try:
                candidate = User.objects.filter(
                    Q(email__iexact=identifier) | Q(username__iexact=identifier),
                    is_active=True,
                ).first()
                if candidate and candidate.check_password(password):
                    user = candidate
            except Exception:
                user = None

        if user:
            login(request, user)
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSerializer(user).data,
                }
            )
        return Response(
            {"detail": "Identifiants invalides (email/identifiant ou mot de passe incorrect)."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response({"detail": "Déconnexion réussie."})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Modification sécurisée du mot de passe vérifiée en Backend."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"detail": "Le mot de passe actuel est incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Mot de passe modifié avec succès."})


class DeleteAccountView(APIView):
    """Suppression définitive de compte vérifiée par mot de passe en Backend."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get("password")

        if not user.check_password(password):
            return Response(
                {"detail": "Mot de passe incorrect. Suppression refusée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response({"detail": "Votre compte a été supprimé définitivement."})
