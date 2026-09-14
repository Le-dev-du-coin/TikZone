"use client";

import CopyButton from "@/components/CopyButton";
import { formatFCFA } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Info, PlusCircle, Router as RouterIcon, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRouterPage() {
  const router = useRouter();
  const [selectedMikhmon, setSelectedMikhmon] = useState("inst-1");
  const [routerName, setRouterName] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [balance, setBalance] = useState(5000);
  const [createdScript, setCreatedScript] = useState<string | null>(null);

  const price = 500;
  const isAffordable = balance >= price;
  const balanceAfter = balance - price;

  const mikhmonOptions = [
    { id: "inst-1", name: "siramanass.tikzone.net (V7)" },
    { id: "inst-2", name: "dembeleservices.tikzone.net (V7)" },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routerName.trim()) return;

    const vpnUser = `${routerName.toLowerCase()}_${Math.floor(10000 + Math.random() * 90000)}`;
    const vpnPass = Math.random().toString(36).slice(-12);
    const script = `/interface l2tp-client add connect-to=vpn.tikzone.net name=${routerName}-VPN user=${vpnUser} password=${vpnPass} disabled=no add-default-route=no use-ipsec=no\n/ip firewall filter add action=accept chain=input in-interface=${routerName}-VPN comment="TikZone VPN" place-before=0`;

    setCreatedScript(script);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Ajouter un Routeur</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Connectez votre MikroTik à distance via notre tunnel VPN sécurisé.
          </p>
        </div>
      </div>

      {/* Wallet Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Votre solde actuel</span>
            <div className="font-bold text-slate-900 text-base">{formatFCFA(balance)}</div>
          </div>
        </div>
        <Link
          href="/wallet"
          className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Recharger
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-950 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <Info className="w-4 h-4" />
          <span>Informations sur l'abonnement</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-blue-900/80">
          <li><strong>Prix :</strong> 500 CFA / mois (30 jours)</li>
          <li><strong>Ports alloués :</strong> Port API (41xxx) & Winbox (51xxx) dédiés</li>
          <li><strong>Renouvellement :</strong> Automatique si le solde est suffisant</li>
          <li><strong>Script MikroTik :</strong> Fourni immédiatement après la validation</li>
        </ul>
      </div>

      {/* Creation Modal or Form */}
      {createdScript ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 text-emerald-700">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Routeur créé avec succès !</h2>
              <p className="text-xs text-slate-500">Voici votre script de configuration MikroTik personnalisé.</p>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre-wrap leading-relaxed">{createdScript}</pre>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Instructions :</strong> Ouvrez Winbox ou le terminal de votre MikroTik et collez ce script dans <strong>New Terminal</strong>.
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Retour au tableau de bord
            </Link>
            <CopyButton text={createdScript} label="Copier le script complet" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Mikhmon Destination Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Mikhmon de destination *
            </label>
            <select
              value={selectedMikhmon}
              onChange={(e) => setSelectedMikhmon(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
            >
              {mikhmonOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">Le routeur sera associé à cet espace Mikhmon.</p>
          </div>

          {/* Router Name */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nom du routeur *
            </label>
            <input
              type="text"
              required
              placeholder="ex: routeur1, client-hotel, zone-sud"
              value={routerName}
              onChange={(e) => setRouterName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
            />
            <p className="text-[11px] text-slate-500">Lettres minuscules, chiffres et tirets uniquement.</p>
          </div>

          {/* Auto Renew Checkbox */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
            />
            <label htmlFor="autoRenew" className="text-xs text-slate-700 cursor-pointer">
              <strong>Renouvellement automatique :</strong> Reconduire l'abonnement chaque mois si mon solde le permet.
            </label>
          </div>

          {/* Financial Recap */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-amber-900 flex items-center justify-between">
              <span>Abonnement routeur (30 jours)</span>
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
            disabled={!isAffordable || !routerName.trim()}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
              isAffordable && routerName.trim()
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Créer le routeur ({formatFCFA(price)})</span>
          </button>
        </form>
      )}
    </div>
  );
}
