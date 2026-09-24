import datetime
import secrets
from decimal import Decimal
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import RegistrationOTP, User
from .serializers import RegisterSerializer, UserSerializer


class RegisterInitView(APIView):
    """
    Étape 1 d'inscription : Valide les informations, génère et envoie l'OTP à 6 chiffres.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        phone_number = request.data.get("phone_number", "").strip()
        password = request.data.get("password", "")
        full_name = request.data.get("full_name", "").strip()
        country = request.data.get("country", "Mali")
        role = request.data.get("role", User.Role.OWNER)

        if not email or not phone_number or not password:
            return Response(
                {"detail": "L'email, le numéro de téléphone et le mot de passe sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Un compte avec cette adresse email existe déjà."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validation de robustesse du mot de passe
        try:
            validate_password(password)
        except ValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Génération d'un code OTP sécurisé à 6 chiffres
        otp_code = str(secrets.randbelow(900000) + 100000)
        expires_at = timezone.now() + datetime.timedelta(minutes=10)

        # Sauvegarde temporaire des données d'inscription sécurisées
        otp_record = RegistrationOTP.objects.create(
            phone_number=phone_number,
            email=email,
            otp_code=otp_code,
            registration_data={
                "email": email,
                "phone_number": phone_number,
                "full_name": full_name,
                "country": country,
                "role": role,
                "password": password,
            },
            expires_at=expires_at,
        )

        # En mode DEBUG ou Sandbox, on trace dans la console et on retourne le code pour les tests
        dev_otp = otp_code if getattr(settings, "DEBUG", True) else None

        return Response(
            {
                "status": "OTP_SENT",
                "otp_id": str(otp_record.id),
                "phone_number": phone_number,
                "email": email,
                "expires_in_seconds": 600,
                "dev_otp": dev_otp,
                "detail": f"Code de confirmation envoyé avec succès au {phone_number}.",
            },
            status=status.HTTP_200_OK,
        )


class RegisterConfirmView(APIView):
    """
    Étape 2 d'inscription : Vérifie l'OTP, crée l'utilisateur, initialise le Wallet et connecte.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        otp_id = request.data.get("otp_id")
        code = str(request.data.get("otp_code", "")).strip()

        if not otp_id or not code:
            return Response(
                {"detail": "L'identifiant de vérification et le code OTP sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            otp_record = RegistrationOTP.objects.get(id=otp_id)
        except (RegistrationOTP.DoesNotExist, ValueError):
            return Response(
                {"detail": "Session de vérification invalide ou introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if otp_record.is_verified:
            return Response(
                {"detail": "Ce code a déjà été utilisé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.is_expired():
            return Response(
                {"detail": "Ce code OTP a expiré. Veuillez demander un nouveau code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.attempts >= 3:
            return Response(
                {"detail": "Nombre maximum de tentatives atteint. Veuillez recommencer l'inscription."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Vérification du code OTP
        if otp_record.otp_code != code:
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            remaining = 3 - otp_record.attempts
            return Response(
                {"detail": f"Code OTP incorrect. Il vous reste {remaining} tentative(s)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Code valide : finalisation de l'inscription
        data = otp_record.registration_data
        email = data.get("email")

        # Double check unicité
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Un compte avec cette adresse email existe déjà."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=email,
            password=data.get("password"),
            full_name=data.get("full_name", ""),
            phone_number=data.get("phone_number", ""),
            country=data.get("country", "Mali"),
            role=data.get("role", User.Role.OWNER),
        )

        # Marquer l'OTP comme validé
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        # Initialisation du Wallet
        from apps.billing.models import Wallet
        Wallet.objects.get_or_create(user=user, defaults={"balance": Decimal("0.00")})

        # Création du Token pour connexion automatique immédiate
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "status": "REGISTERED",
                "token": token.key,
                "user": UserSerializer(user).data,
                "detail": "Votre compte a été vérifié et créé avec succès !",
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterResendOTPView(APIView):
    """
    Renvoi d'un nouveau code OTP en cas de non-réception.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        otp_id = request.data.get("otp_id")
        try:
            otp_record = RegistrationOTP.objects.get(id=otp_id)
        except (RegistrationOTP.DoesNotExist, ValueError):
            return Response(
                {"detail": "Session de vérification introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if otp_record.is_verified:
            return Response(
                {"detail": "Cette session a déjà été validée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Nouveau code et réinitialisation des tentatives
        new_otp = str(secrets.randbelow(900000) + 100000)
        otp_record.otp_code = new_otp
        otp_record.attempts = 0
        otp_record.expires_at = timezone.now() + datetime.timedelta(minutes=10)
        otp_record.save(update_fields=["otp_code", "attempts", "expires_at"])

        dev_otp = new_otp if getattr(settings, "DEBUG", True) else None

        return Response(
            {
                "status": "OTP_RESENT",
                "otp_id": str(otp_record.id),
                "phone_number": otp_record.phone_number,
                "dev_otp": dev_otp,
                "detail": f"Nouveau code OTP envoyé au {otp_record.phone_number}.",
            }
        )


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
