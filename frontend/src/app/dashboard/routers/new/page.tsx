"use client";

import CopyButton from "@/components/CopyButton";
import { api, InstanceData } from "@/lib/api";
import { walletEvents } from "@/lib/wallet-events";
import { formatFCFA } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Plus,
  PlusCircle,
  Router as RouterIcon,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function NewRouterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpace = searchParams.get("space") || "";

  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [selectedMikhmon, setSelectedMikhmon] = useState(initialSpace);
  const [routerName, setRouterName] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mikroot_last_balance");
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // État de succès détaillé
  const [createdSuccess, setCreatedSuccess] = useState<{
    routerName: string;
    spaceName: string;
    script: string;
    apiPort: number;
    winboxPort: number;
    vpnServer: string;
    newBalance: number;
  } | null>(null);

  const price = 500;

  useEffect(() => {
    async function loadData() {
      try {
        const [instList, wallet] = await Promise.all([api.getInstances(), api.getWallet()]);
        if (instList && instList.length > 0) {
          setInstances(instList);
          if (!selectedMikhmon) {
            setSelectedMikhmon(instList[0].id);
          }
        }
        if (wallet && typeof wallet.balance === "number") {
          setBalance(wallet.balance);
        }
      } catch {
        // Ignorer
      }
    }
    loadData();

    const unsubscribe = walletEvents.subscribe((newBal) => {
      setBalance(newBal);
    });
    return () => unsubscribe();
  }, [selectedMikhmon]);

  const isAffordable = balance >= price;
  const balanceAfter = balance - price;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routerName.trim() || !selectedMikhmon) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.createRouter(routerName.trim(), selectedMikhmon, autoRenew);
      const vpnCred = res.router.vpn;
      const targetInst = instances.find((i) => i.id === selectedMikhmon);

      setCreatedSuccess({
        routerName: res.router.name,
        spaceName: targetInst ? targetInst.name : "votre espace",
        script: res.script,
        apiPort: vpnCred ? vpnCred.api_port : 41009,
        winboxPort: vpnCred ? vpnCred.winbox_port : 51009,
        vpnServer: vpnCred ? vpnCred.vpn_server : "vpn.tikzone.net",
        newBalance: res.new_balance ?? balanceAfter,
      });

      if (typeof res.new_balance === "number") {
        setBalance(res.new_balance);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la création du routeur.");
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Ajouter un Routeur</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Connectez votre MikroTik à distance via notre tunnel VPN sécurisé.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-3xl p-5 text-xs text-blue-950 dark:text-blue-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4" />
          <span>Informations sur l'abonnement routeur</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-blue-900/80 dark:text-blue-300/80">
          <li><strong>Tarif :</strong> 500 CFA / mois (30 jours de validité)</li>
          <li><strong>Ports alloués :</strong> Port API (41xxx) & Port Winbox (51xxx) uniques avec nom de domaine</li>
          <li><strong>Unicité :</strong> Le nom doit être unique au sein de l'espace sélectionné</li>
          <li><strong>Script MikroTik :</strong> Généré instantanément après validation</li>
        </ul>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {createdSuccess ? (
        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Routeur « {createdSuccess.routerName} » activé avec succès !
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Rattaché à <strong>{createdSuccess.spaceName}.tikzone.net</strong> • Débit : <strong>-500 FCFA</strong> (Nouveau solde : {formatFCFA(createdSuccess.newBalance)})
            </p>
          </div>


          {/* Endpoints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Port API MikroTik</span>
              <div className="font-mono text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                <span>{createdSuccess.vpnServer}:{createdSuccess.apiPort}</span>
                <CopyButton text={`${createdSuccess.vpnServer}:${createdSuccess.apiPort}`} label="Copier" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Port Winbox Distant</span>
              <div className="font-mono text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                <span>{createdSuccess.vpnServer}:{createdSuccess.winboxPort}</span>
                <CopyButton text={`${createdSuccess.vpnServer}:${createdSuccess.winboxPort}`} label="Copier" />
              </div>
            </div>
          </div>

          {/* Script Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span>Script de configuration RouterOS 7</span>
              </div>
              <CopyButton text={createdSuccess.script} label="Copier le script" />
            </div>

            <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{createdSuccess.script}</pre>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              <strong>Instructions :</strong> Connectez-vous à votre routeur MikroTik via Winbox, cliquez sur <strong>New Terminal</strong> et collez le script ci-dessus.
            </p>
          </div>

          {/* Navigation CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-600/20 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accéder au tableau de bord</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedSuccess(null);
                setRouterName("");
              }}
              className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
            >
              Ajouter un autre routeur
            </button>
          </div>
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Aucun espace Mikhmon disponible</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Vous devez d'abord créer un espace Mikhmon avant de pouvoir y relier un routeur MikroTik.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/mikhmon/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Acheter un Espace Mikhmon (1 000 CFA)</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Espace de destination *
            </label>
            <select
              value={selectedMikhmon}
              onChange={(e) => setSelectedMikhmon(e.target.value)}
              className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-slate-200"
            >
              {instances.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}.tikzone.net (ROS {opt.routeros_version})
                </option>
              ))}

            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nom du routeur *
            </label>
            <input
              type="text"
              required
              placeholder="ex: routeur1, client-hotel, zone-sud"
              value={routerName}
              onChange={(e) => setRouterName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-900 dark:text-white transition-all"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Lettres minuscules, chiffres et tirets uniquement.</p>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="autoRenew" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <strong>Renouvellement automatique :</strong> Reconduire l'abonnement chaque mois si mon solde le permet.
            </label>
          </div>

          {/* Financial Recap */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 text-xs space-y-2">
            <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between">
              <span>Abonnement routeur (30 jours)</span>
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
            disabled={!isAffordable || !routerName.trim() || isLoading}
            className={`w-full py-3.5 px-4 rounded-2xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
              isAffordable && routerName.trim() && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-600/20"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? "Création en cours..." : `Créer le routeur (${formatFCFA(price)})`}</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function DashboardNewRouterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">Chargement...</div>}>
      <NewRouterForm />
    </Suspense>
  );
}
