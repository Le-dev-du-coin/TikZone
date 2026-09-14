"use client";

import { formatFCFA } from "@/lib/utils";
import { ArrowLeft, Check, CheckCircle2, Globe, Info, PlusCircle, Server, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMikhmonPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [version, setVersion] = useState<"V7" | "V6">("V7");
  const [balance, setBalance] = useState(5000);
  const price = 1000;

  const isAffordable = balance >= price;
  const balanceAfter = balance - price;

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    alert(`Félicitations ! L'instance Mikhmon '${name}' a été créée avec succès pour 1000 FCFA.`);
    router.push("/");
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Acheter un Mikhmon</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Créez une nouvelle instance Mikhmon en ligne avec son sous-domaine dédié.
          </p>
        </div>
      </div>

      {/* Wallet Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Votre solde actuel</span>
            <div className="font-bold text-slate-900 text-base">{formatFCFA(balance)}</div>
          </div>
        </div>
        <Link
          href="/wallet"
          className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Recharger
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
          <Info className="w-4 h-4" />
          <span>Informations sur l'achat</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-indigo-900/80">
          <li><strong>Prix :</strong> 1 000 CFA (paiement unique)</li>
          <li><strong>Validité :</strong> Illimitée (aucune expiration sur l'espace Mikhmon)</li>
          <li><strong>Capacité :</strong> Gérez autant de routeurs MikroTik que vous voulez</li>
          <li><strong>Accès :</strong> Interface Mikhmon en ligne 24/7 optimisée mobile</li>
        </ul>
      </div>

      {/* Purchase Form */}
      <form onSubmit={handlePurchase} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Nom du Mikhmon (Sous-domaine) *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="ex: siramanass, hotel-etoile, zone-dakar"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Lettres minuscules, chiffres et tirets uniquement.
          </p>

          {/* URL Preview */}
          {name && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2 text-slate-700 font-mono">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>URL finale :</span>
              <strong className="text-blue-700">https://{name}.tikzone.net</strong>
            </div>

          )}
        </div>

        {/* RouterOS Version Choice */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Version RouterOS compatible *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setVersion("V7")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                version === "V7"
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-sm">RouterOS v7</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Recommandé
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pour ROS 7.10 à 7.16+</p>
            </div>

            <div
              onClick={() => setVersion("V6")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                version === "V6"
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="font-bold text-slate-900 text-sm">RouterOS v6</div>
              <p className="text-xs text-slate-500 mt-1">Pour ROS 6.1 à 6.49 (anciens modèles)</p>
            </div>
          </div>
        </div>

        {/* Financial Recap */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-amber-900 flex items-center justify-between">
            <span>Coût de l'instance Mikhmon</span>
            <span>{formatFCFA(price)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Solde actuel</span>
            <span>{formatFCFA(balance)}</span>
          </div>
          <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between font-bold text-slate-900">
            <span>Solde après achat</span>
            <span className={isAffordable ? "text-emerald-700" : "text-rose-600"}>
              {formatFCFA(balanceAfter)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isAffordable || !name.trim()}
          className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
            isAffordable && name.trim()
              ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Créer l'instance ({formatFCFA(price)})</span>
        </button>
      </form>
    </div>
  );
}
