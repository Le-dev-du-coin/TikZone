"use client";

import { use, useEffect, useState } from "react";
import { api, RouterData } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  Shield,
  Terminal,
  Wifi,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterSystemPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [router, setRouter] = useState<RouterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<string | null>(null);
  const [pingTesting, setPingTesting] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getRouters()
      .then((routers) => {
        const found = routers.find((r) => r.id === routerId);
        if (found) setRouter(found);
      })
      .finally(() => setLoading(false));
  }, [routerId]);

  const handlePing = async () => {
    setPingTesting(true);
    try {
      const res = await api.pingRouter(routerId);
      setPingStatus("ONLINE");
      setPingLatency(res.latency || "< 100ms");
    } catch (err) {
      setPingStatus("OFFLINE");
      setPingLatency(null);
    } finally {
      setPingTesting(false);
    }
  };

  const handleReboot = async () => {
    setRebooting(true);
    try {
      await api.rebootRouter(routerId);
      setShowRebootModal(false);
      alert("Ordre de redémarrage envoyé au routeur ! Il sera de nouveau joignable dans environ 60 secondes.");
    } catch (err: any) {
      alert("Erreur lors du redémarrage : " + err.message);
    } finally {
      setRebooting(false);
    }
  };

  const scriptText =
    router?.vpn?.mikrotik_script ||
    router?.script ||
    `/interface l2tp-client add connect-to=vpn.tikzone.net name=${router?.name || "Router"}-VPN user=${router?.name || "user"} password=secret disabled=no`;

  const copyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Outils Système & Maintenance</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pilotez l'état du routeur MikroTik à distance, testez la liaison réseau et gérez les accès VPN.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1 : Connectivité Réseau & Ping */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Test de Connectivité Réseau (Ping)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vérifie la réponse ICMP directe via le tunnel VPN privé.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">IP VPN Assignée :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {router?.vpn?.assigned_ip || "Non assignée"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Statut de la liaison :</span>
              {pingStatus === "ONLINE" ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  En ligne ({pingLatency})
                </span>
              ) : pingStatus === "OFFLINE" ? (
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Injoignable
                </span>
              ) : (
                <span className="text-slate-400">En attente de test</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePing}
            disabled={pingTesting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Activity className={`w-4 h-4 ${pingTesting ? "animate-pulse" : ""}`} />
            <span>{pingTesting ? "Test du lien en cours..." : "Tester la Connectivité (Ping)"}</span>
          </button>
        </div>

        {/* Card 2 : Redémarrage à Distance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Redémarrage du Boîtier MikroTik
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envoie un ordre de redémarrage matériel à distance.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              Le redémarrage permet de purger la RAM et de relancer les services réseau en cas de dysfonctionnement sur site.
            </p>
            <p className="font-semibold text-rose-600 dark:text-rose-400">
              ⚠️ Attention : La connexion Internet des clients sera coupée pendant 1 minute.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRebootModal(true)}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>Redémarrer le Routeur</span>
          </button>
        </div>

        {/* Card 3 : Paramètres VPN & Script RouterOS */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Script de Connexion RouterOS (Terminal MikroTik)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Script de configuration automatique généré pour relier ce boîtier à TikZone.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
            >
              <span>Afficher le script</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Port API Distant</p>
              <p className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                {router?.vpn?.api_port || 41001}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Port Winbox Distant</p>
              <p className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                {router?.vpn?.winbox_port || 51001}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Protocole VPN</p>
              <p className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                WireGuard / L2TP
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Serveur VPN</p>
              <p className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {router?.vpn?.vpn_server || "vpn.tikzone.net"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Script RouterOS pour {router?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copiez ce script et collez-le directement dans le <strong>Terminal de Winbox</strong> sur votre MikroTik :
            </p>

            <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60">
              {scriptText}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={copyScript}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Copié dans le presse-papier !" : "Copier le script"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reboot Confirm Modal */}
      {showRebootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Confirmer le redémarrage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Êtes-vous certain de vouloir redémarrer le routeur <strong>{router?.name}</strong> ?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRebootModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReboot}
                disabled={rebooting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {rebooting ? "Envoi de l'ordre..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
