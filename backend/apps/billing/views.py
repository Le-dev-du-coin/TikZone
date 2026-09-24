from decimal import Decimal
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, Wallet
from .serializers import DepositRequestSerializer, TransactionSerializer, WalletSerializer


class MyWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response(WalletSerializer(wallet).data)


class DepositView(APIView):
    """Permet à l'utilisateur de simuler ou initier une recharge de Wallet."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DepositRequestSerializer(data=request.data)
        if serializer.is_valid():
            wallet, _ = Wallet.objects.get_or_create(user=request.user)
            amount = Decimal(serializer.validated_data["amount"])
            method = serializer.validated_data["payment_method"]
            ref = serializer.validated_data.get("reference", "")

            # En dev/mode standard, on crédite et on crée la transaction complétée
            wallet.credit(amount)
            transaction = Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                type=Transaction.Type.DEPOSIT,
                status=Transaction.Status.COMPLETED,
                payment_method=method,
                reference=ref,
                description=f"Recharge de {amount} FCFA via {method}",
            )
            return Response(
                {
                    "detail": f"Recharge de {amount} FCFA effectuée avec succès.",
                    "balance": wallet.balance,
                    "transaction": TransactionSerializer(transaction).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LigdiCashInitiateView(APIView):
    """Initialise un paiement LigdiCash (Sandbox ou Production)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount_raw = request.data.get("amount")
        if not amount_raw:
            return Response({"detail": "Le montant est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_raw))
        except Exception:
            return Response({"detail": "Montant invalide."}, status=status.HTTP_400_BAD_REQUEST)

        customer_phone = request.data.get("customer_phone", request.user.phone_number or "")
        return_url = request.data.get("return_url", "")
        cancel_url = request.data.get("cancel_url", "")
        callback_url = request.data.get("callback_url", "")

        from apps.billing.services.ligdicash import LigdiCashGateway
        gateway = LigdiCashGateway()

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        try:
            result = gateway.initiate_recharge(
                wallet=wallet,
                amount=amount,
                customer_phone=customer_phone,
                customer_name=request.user.full_name or "Client TikZone",
                customer_email=request.user.email,
                return_url=return_url,
                cancel_url=cancel_url,
                callback_url=callback_url,
            )
            if not result.get("success"):
                return Response({"detail": result.get("error", "Erreur d'initialisation LigdiCash")}, status=status.HTTP_400_BAD_REQUEST)

            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class LigdiCashVerifyView(APIView):
    """Vérifie et valide un jeton LigdiCash pour créditer le portefeuille."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Le jeton de paiement est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.billing.services.ligdicash import LigdiCashGateway
        gateway = LigdiCashGateway()

        result = gateway.verify_and_credit(token)
        if not result.get("success"):
            return Response({"detail": result.get("error", "Échec de validation LigdiCash")}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class LigdiCashCallbackView(APIView):
    """Webhook IPN appelé automatiquement par LigdiCash lors d'un paiement complété."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token") or request.query_params.get("token")
        if not token:
            return Response({"detail": "Token manquant"}, status=status.HTTP_400_BAD_REQUEST)

        from apps.billing.services.ligdicash import LigdiCashGateway
        gateway = LigdiCashGateway()

        result = gateway.verify_and_credit(token)
        return Response({"status": "received", "result": result}, status=status.HTTP_200_OK)

