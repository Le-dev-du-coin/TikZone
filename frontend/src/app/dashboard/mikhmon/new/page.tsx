"use client";

import { api } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import { AlertCircle, ArrowLeft, CheckCircle2, Globe, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardNewMikhmonPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [version, setVersion] = useState<"V7" | "V6">("V7");
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mikroot_last_balance");
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const price = 1000;

  useEffect(() => {
    async function fetchBalance() {
      try {
        const wallet = await api.getWallet();
        if (wallet && typeof wallet.balance === "number") {
          setBalance(wallet.balance);
        }
      } catch {
        // Ignorer
      }
    }
    fetchBalance();
  }, []);

  const isAffordable = balance >= price;
  const balanceAfter = balance - price;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.purchaseInstance(name.trim(), version);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'achat de l'espace Mikhmon.");
    } finally {
      setIsLoading(false);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Acheter un Espace Mikhmon</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Créez un nouvel espace cloud indépendant avec son sous-domaine dédié.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-3xl p-5 text-xs text-indigo-950 dark:text-indigo-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
          <Info className="w-4 h-4" />
          <span>Informations sur votre espace</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-indigo-900/80 dark:text-indigo-300/80">
          <li><strong>Tarif :</strong> 1 000 CFA (paiement unique déduit de votre portefeuille)</li>
          <li><strong>Durée :</strong> Illimitée (aucun abonnement récurrent sur l'espace)</li>
          <li><strong>Capacité :</strong> Rattachez autant de routeurs MikroTik que vous souhaitez</li>
          <li><strong>Accès :</strong> Interface cloud accessible 24/7 optimisée mobile</li>
        </ul>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Purchase Form */}
      <form onSubmit={handlePurchase} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Nom de l'Espace (Sous-domaine) *
          </label>
          <input
            type="text"
            required
            placeholder="ex: siramanass, hotel-etoile, zone-dakar"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-900 dark:text-white transition-all"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Lettres minuscules, chiffres et tirets uniquement.</p>

          {name && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>URL finale :</span>
              <strong className="text-blue-700 dark:text-blue-400">https://{name}.tikzone.net</strong>
            </div>

          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Version RouterOS compatible *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setVersion("V7")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                version === "V7"
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 dark:text-white text-sm">RouterOS v7</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Recommandé
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pour ROS 7.10 à 7.21+</p>
            </div>

            <div
              onClick={() => setVersion("V6")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                version === "V6"
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
              }`}
            >
              <div className="font-bold text-slate-900 dark:text-white text-sm">RouterOS v6</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pour ROS 6.1 à 6.49</p>
            </div>
          </div>
        </div>

        {/* Financial Recap */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 text-xs space-y-2">
          <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between">
            <span>Coût de création</span>
            <span>{formatFCFA(price)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Solde actuel</span>
            <span>{formatFCFA(balance)}</span>
          </div>
          <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span>Solde après création</span>
            <span className={isAffordable ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
              {formatFCFA(balanceAfter)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isAffordable || !name.trim() || isLoading}
          className={`w-full py-3.5 px-4 rounded-2xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
            isAffordable && name.trim() && !isLoading
              ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-600/20"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoading ? "Création en cours..." : `Créer l'Espace (${formatFCFA(price)})`}</span>
        </button>
      </form>
    </div>
  );
}
