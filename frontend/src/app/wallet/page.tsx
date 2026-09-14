"use client";

import { formatFCFA } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, CreditCard, History, Phone, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CountrySelect from "@/components/CountrySelect";

export default function WalletPage() {
  const [balance, setBalance] = useState(5000);
  const [country, setCountry] = useState("ML");
  const [amount, setAmount] = useState("5000");
  const [paymentMethod, setPaymentMethod] = useState("ORANGE_MONEY");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    { id: "ORANGE_MONEY", name: "Orange Money", desc: "Confirmation Orange", color: "from-orange-500 to-amber-500" },
    { id: "WAVE", name: "Wave", desc: "Paiement Wave instantané", color: "from-sky-500 to-blue-600" },
    { id: "MOOV", name: "Moov Money", desc: "Moov Flooz / Money", color: "from-blue-600 to-indigo-600" },
    { id: "CARD", name: "Carte Bancaire", desc: "VISA / MasterCard", color: "from-slate-700 to-slate-900" },
    { id: "OFFLINE", name: "Paiement Hors-Ligne", desc: "Wave + Reçu de transfert", color: "from-emerald-600 to-teal-700" },
  ];

  const transactions = [
    { id: "tx-1", type: "Recharge", amount: "+5 000 FCFA", method: "Orange Money", date: "01/09/2026 18:30", status: "Complété" },
    { id: "tx-2", type: "Abonnement Routeur", amount: "-500 FCFA", method: "Wallet", date: "17/08/2026 19:01", status: "Complété" },
    { id: "tx-3", type: "Achat Mikhmon", amount: "-1 000 FCFA", method: "Wallet", date: "17/08/2026 18:45", status: "Complété" },
  ];

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 100) return;

    setBalance((prev) => prev + numAmount);
    setSuccessMessage(`Félicitations ! Votre compte a été rechargé de ${formatFCFA(numAmount)} avec succès.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Recharger mon compte</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Rechargez votre solde instantanément par Mobile Money ou Carte Bancaire.
          </p>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between opacity-85 text-xs font-semibold uppercase tracking-wider">
          <span>Solde Disponible</span>
          <Wallet className="w-5 h-5" />
        </div>
        <div className="text-3xl sm:text-4xl font-black tracking-tight">{formatFCFA(balance)}</div>
        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs opacity-80">
          <span>TikZone Wallet Sécurisé</span>
          <span>Devise : Franc CFA</span>
        </div>

      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Recharge Form */}
      <form onSubmit={handleDeposit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Country Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Pays de paiement *
          </label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Montant à recharger (FCFA) *
          </label>
          <input
            type="number"
            min="500"
            step="500"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
          />
          {/* Quick preset amounts */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[1000, 2000, 5000, 10000, 20000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                +{preset.toLocaleString("fr-FR")}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Moyen de paiement *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === pm.id
                    ? "border-blue-600 bg-blue-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="font-bold text-slate-900 text-sm">{pm.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">{pm.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Procéder au paiement ({formatFCFA(parseFloat(amount) || 0)})</span>
        </button>
      </form>

      {/* Transaction History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <History className="w-4 h-4 text-slate-500" />
          <span>Historique récent des transactions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">{tx.type}</div>
                <p className="text-[11px] text-slate-500">{tx.date} • {tx.method}</p>
              </div>
              <div className="text-right">
                <div className={`font-bold ${tx.amount.startsWith("+") ? "text-emerald-600" : "text-slate-900"}`}>
                  {tx.amount}
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
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
