"use client";

import { api, TransactionData } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import CountrySelect from "@/components/CountrySelect";

export default function DashboardWalletPage() {
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mikroot_last_balance");
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return 0;
  });
  const [country, setCountry] = useState("ML");
  const [amount, setAmount] = useState("5000");
  const [paymentMethod, setPaymentMethod] = useState("LIGDICASH");
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deposit" | "history">("deposit");
  const [loadingTx, setLoadingTx] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  // Modal Sandbox LigdiCash
  const [sandboxSession, setSandboxSession] = useState<{
    token: string;
    amount: number;
    reference: string;
  } | null>(null);
  const [isVerifyingSandbox, setIsVerifyingSandbox] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "history") {
        setActiveTab("history");
      }
      // Si retour de paiement LigdiCash avec token
      const token = params.get("token");
      if (token) {
        verifyPaymentToken(token);
      }
    }
  }, []);

  const verifyPaymentToken = async (tok: string) => {
    try {
      setIsSubmitting(true);
      const res = await api.verifyLigdiCash(tok);
      if (res.success) {
        setBalance(res.balance);
        setSuccessMessage(res.message || "Paiement LigdiCash validé avec succès !");
        loadWallet();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de validation du paiement.");
    } finally {
      setIsSubmitting(false);
      // Nettoyage de l'URL
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  };

  const loadWallet = async () => {
    try {
      setLoadingTx(true);
      const data = await api.getWallet();
      if (data && typeof data.balance === "number") {
        setBalance(data.balance);
        localStorage.setItem("mikroot_last_balance", data.balance.toString());
      }
      if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    } catch {
      // Ignorer
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const paymentMethods = [
    {
      id: "LIGDICASH",
      name: "LigdiCash (Multi-Opérateurs)",
      desc: "Orange Money, Moov, Wave, MTN, Telecel & Cartes",
      badge: "Sandbox / Agrégateur",
      isLigdi: true,
    },
    {
      id: "ORANGE_MONEY",
      name: "Orange Money Direct",
      desc: "Paiement Orange instantané",
      isLigdi: false,
    },
    {
      id: "WAVE",
      name: "Wave Direct",
      desc: "Validation Wave directe",
      isLigdi: false,
    },
    {
      id: "MOOV",
      name: "Moov Money Direct",
      desc: "Moov Flooz / Money",
      isLigdi: false,
    },
    {
      id: "CARD",
      name: "Carte Bancaire",
      desc: "VISA / MasterCard",
      isLigdi: false,
    },
    {
      id: "OFFLINE",
      name: "Paiement Hors-Ligne",
      desc: "Wave + Reçu de transfert",
      isLigdi: false,
    },
  ];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 100) {
      setErrorMessage("Le montant minimum est de 100 FCFA.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Passage par la passerelle LigdiCash
      if (paymentMethod === "LIGDICASH") {
        const initRes = await api.initiateLigdiCash(numAmount, phone);
        if (initRes.success) {
          if (initRes.is_sandbox) {
            // Mode Sandbox : on affiche la modale de validation instantanée
            setSandboxSession({
              token: initRes.token,
              amount: numAmount,
              reference: initRes.reference,
            });
          } else if (initRes.checkout_url) {
            // Mode Production : redirection vers la page sécurisée LigdiCash
            window.location.href = initRes.checkout_url;
          }
        }
      } else {
        // Autres moyens standards / directs
        const res = await api.deposit(numAmount, paymentMethod, `DEP-${Date.now()}`);
        if (typeof res.balance === "number") {
          setBalance(res.balance);
        } else {
          setBalance((prev) => prev + numAmount);
        }
        setSuccessMessage(`Félicitations ! Votre compte a été rechargé de ${formatFCFA(numAmount)} avec succès.`);
        loadWallet();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la tentative de paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulation de validation en Sandbox
  const handleConfirmSandboxPayment = async () => {
    if (!sandboxSession) return;
    setIsVerifyingSandbox(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyLigdiCash(sandboxSession.token);
      if (res.success) {
        setBalance(res.balance);
        setSuccessMessage(
          `Succès ! Recharge Sandbox de ${formatFCFA(sandboxSession.amount)} créditée sur votre portefeuille.`
        );
        setSandboxSession(null);
        loadWallet();
      } else {
        setErrorMessage(res.message || "Erreur lors de la validation Sandbox.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Impossible de valider le paiement Sandbox.");
    } finally {
      setIsVerifyingSandbox(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Portefeuille & Recharges</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Rechargez votre solde instantanément par LigdiCash, Mobile Money ou Carte Bancaire.
          </p>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-tr from-slate-900 via-slate-850 to-blue-950 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Solde Disponible</span>
          <Wallet className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-3xl sm:text-4xl font-black text-white">{formatFCFA(balance)}</div>
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>TikZone Wallet Sécurisé</span>
          </span>
          <span className="font-semibold text-slate-300">Devise : Franc CFA</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation par Onglets */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("deposit")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "deposit"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Recharger mon compte</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "history"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          <span>Historique des paiements ({transactions.length})</span>
        </button>
      </div>

      {/* ONGLET 1 : RECHARGE */}
      {activeTab === "deposit" && (
        <form onSubmit={handleDeposit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5 animate-in fade-in">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pays de paiement *
            </label>
            <CountrySelect value={country} onChange={setCountry} />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Montant à recharger (FCFA) *
            </label>
            <input
              type="number"
              min="100"
              step="500"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3.5 text-lg font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {[1000, 2000, 5000, 10000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  +{preset.toLocaleString("fr-FR")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Moyen de paiement *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    paymentMethod === pm.id
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
                  }`}
                >
                  {pm.badge && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {pm.badge}
                    </span>
                  )}
                  <div className="font-bold text-slate-900 dark:text-white text-sm pr-12">{pm.name}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pm.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {paymentMethod === "LIGDICASH" && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Numéro de téléphone WhatsApp / Mobile Money
              </label>
              <input
                type="tel"
                placeholder="+223 70 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initialisation du paiement...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>
                  {paymentMethod === "LIGDICASH" ? "Payer via LigdiCash Sandbox" : "Procéder au paiement"} (
                  {formatFCFA(parseFloat(amount) || 0)})
                </span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ONGLET 2 : HISTORIQUE DES PAIEMENTS */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <History className="w-4 h-4 text-slate-500" />
              <span>Historique des transactions</span>
            </div>
            <button
              type="button"
              onClick={loadWallet}
              disabled={loadingTx}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
            >
              {loadingTx ? "Actualisation..." : "Actualiser"}
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Aucun paiement enregistré pour le moment
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Vos recharges de compte, achats d'espaces et abonnements de routeurs apparaîtront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => {
                const isCredit = tx.type === "DEPOSIT";
                const dateStr = tx.created_at
                  ? new Date(tx.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "Récemment";

                const typeLabels: Record<string, string> = {
                  DEPOSIT: "Recharge Portefeuille",
                  BUY_INSTANCE: "Achat Espace Mikhmon",
                  BUY_ROUTER: "Abonnement Routeur",
                  AUTO_RENEW: "Renouvellement Auto",
                };

                const statusColors: Record<string, string> = {
                  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                  FAILED: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                };

                const statusLabels: Record<string, string> = {
                  COMPLETED: "Validé",
                  PENDING: "En attente",
                  FAILED: "Échoué",
                };

                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {typeLabels[tx.type] || tx.description || "Paiement"}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span className="uppercase font-semibold">{tx.payment_method}</span>
                        {tx.reference && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                              Réf: {tx.reference}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-black font-mono text-sm ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {isCredit ? "+" : "-"}{formatFCFA(parseFloat(tx.amount) || 0)}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${
                          statusColors[tx.status] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {statusLabels[tx.status] || tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL SIMULATION SANDBOX LIGDICASH */}
      {sandboxSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-wider">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>LigdiCash Sandbox Simulator</span>
              </div>
              <button
                type="button"
                onClick={() => setSandboxSession(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Montant de la recharge :</span>
                <span className="font-black font-mono text-slate-900 dark:text-white text-sm">
                  {formatFCFA(sandboxSession.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Référence interne :</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{sandboxSession.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jeton Sandbox :</span>
                <span className="font-mono text-slate-400 text-[10px] truncate max-w-[180px]">
                  {sandboxSession.token}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              En mode <strong>Sandbox</strong>, vous pouvez valider la transaction instantanément sans débit réel,
              simulant ainsi la réception de l'accusé de réception et le callback webhook du réseau Mobile Money.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isVerifyingSandbox}
                onClick={handleConfirmSandboxPayment}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingSandbox ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validation du paiement en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simuler le paiement validé (Créditer {formatFCFA(sandboxSession.amount)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSandboxSession(null)}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
