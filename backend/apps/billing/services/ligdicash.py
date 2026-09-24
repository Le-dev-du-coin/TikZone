"""Passerelle de paiement LigdiCash (Mode Sandbox & Production).

Supporte les agrégateurs Mobile Money (Orange, Moov, Wave, MTN, Telecel)
et Cartes Bancaires avec confirmation instantanée et sécurisation des recharges.
"""

import logging
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional
import requests
from django.conf import settings
from django.utils import timezone
from apps.billing.models import Transaction, Wallet

logger = logging.getLogger(__name__)


class LigdiCashGateway:
    """Passerelle d'intégration LigdiCash pour TikZone SaaS."""

    BASE_URL_LIVE = "https://app.ligdicash.com/pay/v01"
    CHECKOUT_CREATE_ENDPOINT = f"{BASE_URL_LIVE}/redirect/checkout-invoice/create"
    CHECKOUT_CONFIRM_ENDPOINT = f"{BASE_URL_LIVE}/redirect/checkout-invoice/confirm/"

    def __init__(self):
        self.api_key = getattr(settings, "LIGDICASH_API_KEY", "sandbox_api_key_tikzone")
        self.auth_token = getattr(settings, "LIGDICASH_AUTH_TOKEN", "sandbox_auth_token_tikzone")
        self.is_sandbox = getattr(settings, "LIGDICASH_SANDBOX", True)

    def initiate_recharge(
        self,
        wallet: Wallet,
        amount: Decimal,
        customer_phone: str = "",
        customer_name: str = "",
        customer_email: str = "",
        return_url: str = "",
        cancel_url: str = "",
        callback_url: str = "",
    ) -> Dict[str, Any]:
        """Crée une facture de recharge et génère l'URL de paiement ou de test Sandbox."""
        amount = Decimal(str(amount))
        if amount < Decimal("100.00"):
            raise ValueError("Le montant minimum de recharge est de 100 FCFA.")

        ref_id = f"LC-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        # Création de la transaction en attente (Audit & Traçabilité)
        transaction = Transaction.objects.create(
            wallet=wallet,
            amount=amount,
            type=Transaction.Type.DEPOSIT,
            status=Transaction.Status.PENDING,
            payment_method=Transaction.PaymentMethod.LIGDICASH,
            reference=ref_id,
            description=f"Recharge LigdiCash ({amount} FCFA)",
        )

        # Mode Sandbox ou clés de test
        if self.is_sandbox or self.api_key.startswith("sandbox"):
            sandbox_token = f"sandbox_tok_{uuid.uuid4().hex[:16]}"
            transaction.external_reference = sandbox_token
            transaction.save(update_fields=["external_reference"])

            return {
                "success": True,
                "is_sandbox": True,
                "token": sandbox_token,
                "transaction_id": str(transaction.id),
                "reference": ref_id,
                "amount": float(amount),
                "checkout_url": f"/dashboard/wallet?token={sandbox_token}&status=sandbox_pending",
                "message": "Session de paiement Sandbox LigdiCash initialisée avec succès.",
            }

        # Mode Production : Appel direct à l'API LigdiCash
        headers = {
            "Apikey": self.api_key,
            "Authorization": f"Bearer {self.auth_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        payload = {
            "commande": {
                "invoice": {
                    "items": [
                        {
                            "name": f"Recharge Compte TikZone ({wallet.user.email})",
                            "description": "Crédit solde portefeuille Hotspot TikZone",
                            "quantity": 1,
                            "unit_price": int(amount),
                            "total_price": int(amount),
                        }
                    ],
                    "total_amount": int(amount),
                    "devise": "XOF",
                    "description": f"Recharge TikZone #{ref_id}",
                    "customer": customer_name or wallet.user.full_name or "Client TikZone",
                    "customer_email": customer_email or wallet.user.email,
                    "customer_phone": customer_phone or wallet.user.phone_number,
                },
                "store": {
                    "name": "TikZone Cloud Hotspot",
                    "website_url": "https://tikzone.net",
                },
                "actions": {
                    "cancel_url": cancel_url or "https://tikzone.net/dashboard/wallet?status=cancelled",
                    "return_url": return_url or "https://tikzone.net/dashboard/wallet?status=success",
                    "callback_url": callback_url or "https://tikzone.net/api/billing/ligdicash/callback/",
                },
                "custom_data": {
                    "transaction_id": str(transaction.id),
                    "reference": ref_id,
                    "user_id": str(wallet.user.id),
                },
            }
        }

        try:
            response = requests.post(
                self.CHECKOUT_CREATE_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=15,
            )
            data = response.json()

            if response.status_code in (200, 201) and data.get("response_code") == "00":
                token = data.get("token")
                checkout_url = f"{self.CHECKOUT_CONFIRM_ENDPOINT}?token={token}"
                transaction.external_reference = token
                transaction.save(update_fields=["external_reference"])

                return {
                    "success": True,
                    "is_sandbox": False,
                    "token": token,
                    "transaction_id": str(transaction.id),
                    "reference": ref_id,
                    "amount": float(amount),
                    "checkout_url": checkout_url,
                }
            else:
                err_msg = data.get("description") or data.get("response_text") or "Erreur passerelle LigdiCash"
                logger.error("LigdiCash init error: %s", data)
                transaction.status = Transaction.Status.FAILED
                transaction.description += f" [Échec: {err_msg}]"
                transaction.save(update_fields=["status", "description"])
                return {
                    "success": False,
                    "is_sandbox": False,
                    "error": err_msg,
                }
        except Exception as exc:
            logger.exception("LigdiCash connection exception: %s", exc)
            transaction.status = Transaction.Status.FAILED
            transaction.description += f" [Erreur réseau: {exc}]"
            transaction.save(update_fields=["status", "description"])
            return {
                "success": False,
                "is_sandbox": False,
                "error": f"Connexion impossible avec LigdiCash: {str(exc)}",
            }

    def verify_and_credit(self, token: str) -> Dict[str, Any]:
        """Vérifie le paiement et crédite le solde du portefeuille en toute sécurité."""
        try:
            transaction = Transaction.objects.select_related("wallet", "wallet__user").get(
                external_reference=token
            )
        except Transaction.DoesNotExist:
            return {"success": False, "error": "Transaction introuvable avec ce jeton LigdiCash."}

        # Déjà complété (évite double crédit / attaque par rejeu)
        if transaction.status == Transaction.Status.COMPLETED:
            return {
                "success": True,
                "already_processed": True,
                "status": "COMPLETED",
                "amount": float(transaction.amount),
                "balance": float(transaction.wallet.balance),
                "message": "Paiement déjà validé et crédité sur votre compte.",
            }

        # Validation Sandbox
        if token.startswith("sandbox_tok_") or self.is_sandbox:
            transaction.status = Transaction.Status.COMPLETED
            transaction.description += " [Validé via LigdiCash Sandbox]"
            transaction.save(update_fields=["status", "description"])
            transaction.wallet.credit(transaction.amount)

            logger.info(
                "Sandbox LigdiCash: Wallet %s crédité de %s FCFA (Nouveau solde: %s)",
                transaction.wallet.id,
                transaction.amount,
                transaction.wallet.balance,
            )

            return {
                "success": True,
                "is_sandbox": True,
                "status": "COMPLETED",
                "amount": float(transaction.amount),
                "balance": float(transaction.wallet.balance),
                "message": f"Succès ! Votre compte a été rechargé de {transaction.amount} FCFA (Sandbox).",
            }

        # Validation Live
        headers = {
            "Apikey": self.api_key,
            "Authorization": f"Bearer {self.auth_token}",
            "Accept": "application/json",
        }

        try:
            verify_url = f"{self.CHECKOUT_CONFIRM_ENDPOINT}?token={token}"
            response = requests.get(verify_url, headers=headers, timeout=15)
            data = response.json()

            # Status 'completed' chez LigdiCash
            if data.get("status") == "completed" or data.get("response_code") == "00":
                transaction.status = Transaction.Status.COMPLETED
                transaction.description += " [Validé via LigdiCash Live]"
                transaction.save(update_fields=["status", "description"])
                transaction.wallet.credit(transaction.amount)

                return {
                    "success": True,
                    "is_sandbox": False,
                    "status": "COMPLETED",
                    "amount": float(transaction.amount),
                    "balance": float(transaction.wallet.balance),
                    "message": f"Succès ! Votre compte a été rechargé de {transaction.amount} FCFA.",
                }
            elif data.get("status") in ("pending", "in_progress"):
                return {
                    "success": True,
                    "status": "PENDING",
                    "message": "Paiement en cours de traitement par l'opérateur.",
                }
            else:
                transaction.status = Transaction.Status.FAILED
                transaction.description += f" [Échoué: {data.get('status')}]"
                transaction.save(update_fields=["status", "description"])
                return {
                    "success": False,
                    "status": "FAILED",
                    "error": data.get("description") or "Le paiement a été rejeté ou annulé.",
                }
        except Exception as exc:
            logger.exception("LigdiCash verify exception: %s", exc)
            return {"success": False, "error": f"Erreur de vérification: {str(exc)}"}
