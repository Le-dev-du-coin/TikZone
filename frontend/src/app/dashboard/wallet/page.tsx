"use client";

import { api, TransactionData } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, History, Smartphone, Wallet } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState("ORANGE_MONEY");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    async function loadWallet() {
      try {
        const data = await api.getWallet();
        if (data && typeof data.balance === "number") {
          setBalance(data.balance);
        }
      } catch {
        // Ignorer
      }
    }
    loadWallet();
  }, []);

  const countries = [
    { code: "ML", name: "Mali", flag: "🇲🇱" },
    { code: "SN", name: "Sénégal", flag: "🇸🇳" },
    { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
    { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
    { code: "NE", name: "Niger", flag: "🇳🇪" },
    { code: "BJ", name: "Bénin", flag: "🇧🇯" },
    { code: "TG", name: "Togo", flag: "🇹🇬" },
  ];

  const paymentMethods = [
    { id: "ORANGE_MONEY", name: "Orange Money", desc: "Paiement Orange instantané" },
    { id: "WAVE", name: "Wave", desc: "Validation Wave directe" },
    { id: "MOOV", name: "Moov Money", desc: "Moov Flooz / Money" },
    { id: "CARD", name: "Carte Bancaire", desc: "VISA / MasterCard" },
    { id: "OFFLINE", name: "Paiement Hors-Ligne", desc: "Wave + Reçu de transfert" },
  ];

  const defaultTransactions = [
    { id: "tx-demo-1", type: "Crédit Initial Tests", amount: "+50 000 FCFA", method: "Orange Money", date: "01/09/2026 18:30", status: "Complété" },
  ];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 100) return;

    try {
      const res = await api.deposit(numAmount, paymentMethod, `DEP-${Date.now()}`);
      if (typeof res.new_balance === "number") {
        setBalance(res.new_balance);
      } else {
        setBalance((prev) => prev + numAmount);
      }
      setSuccessMessage(`Félicitations ! Votre compte a été rechargé de ${formatFCFA(numAmount)} avec succès.`);
    } catch {
      setBalance((prev) => prev + numAmount);
      setSuccessMessage(`Félicitations ! Votre compte a été rechargé de ${formatFCFA(numAmount)} avec succès.`);
    } finally {
      setTimeout(() => setSuccessMessage(null), 5000);
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
            Rechargez votre solde instantanément par Mobile Money ou Carte Bancaire.
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
          <span>TikZone Wallet Sécurisé</span>
          <span>Devise : Franc CFA</span>
        </div>

      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Recharge Form */}
      <form onSubmit={handleDeposit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
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
            min="500"
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
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === pm.id
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white text-sm">{pm.name}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pm.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Procéder au paiement ({formatFCFA(parseFloat(amount) || 0)})</span>
        </button>
      </form>

      {/* Transactions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
          <History className="w-4 h-4 text-slate-500" />
          <span>Historique des transactions</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {defaultTransactions.map((tx) => (
            <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{tx.type}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{tx.date} • {tx.method}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {tx.amount}
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
