"use client";

import { use, useEffect, useState } from "react";
import { api, RouterData } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  HardDrive,
  Info,
  KeyRound,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterDashboardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [router, setRouter] = useState<RouterData | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [hotspot, setHotspot] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedWinbox, setCopiedWinbox] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);

  // Formulaire d'ajout
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addProfile, setAddProfile] = useState("default");
  const [addTimeLimit, setAddTimeLimit] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formulaire de génération par lot
  const [genCount, setGenCount] = useState(20);
  const [genProfile, setGenProfile] = useState("default");
  const [genTimeLimit, setGenTimeLimit] = useState("1h");
  const [genPrefix, setGenPrefix] = useState("");
  const [genCodeLength, setGenCodeLength] = useState(6);
  const [genPrice, setGenPrice] = useState(100);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [routersList, sysInfo, hsOverview, logList, profList] = await Promise.all([
        api.getRouters(),
        api.getRouterSystemInfo(routerId).catch(() => null),
        api.getRouterHotspotOverview(routerId).catch(() => null),
        api.getRouterLogs(routerId, 15).catch(() => []),
        api.getRouterProfiles(routerId).catch(() => ({ results: [] })),
      ]);

      const current = routersList.find((r) => r.id === routerId);
      if (current) setRouter(current);
      if (sysInfo) setTelemetry(sysInfo);
      if (hsOverview) setHotspot(hsOverview);
      if (logList) setLogs(logList.results || logList);
      if (profList?.results) setProfiles(profList.results);
    } catch (err) {
      console.error("Erreur chargement données routeur:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [routerId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await api.addRouterHotspotUser(routerId, {
        name: addName,
        password: addPassword || addName,
        profile: addProfile,
        time_limit: addTimeLimit,
        comment: "TikZone Ticket",
      });
      setActionSuccess(`Utilisateur '${addName}' créé avec succès !`);
      setAddName("");
      setAddPassword("");
      setAddTimeLimit("");
      setTimeout(() => setShowAddModal(false), 1200);
      loadData(true);
    } catch (err: any) {
      setActionError(err.message || "Erreur de création");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await api.generateRouterTickets(routerId, {
        count: genCount,
        profile: genProfile,
        time_limit: genTimeLimit,
        prefix: genPrefix,
        code_length: genCodeLength,
        price: genPrice,
      });
      setActionSuccess(`${res.count || genCount} tickets générés avec succès !`);
      loadData(true);
    } catch (err: any) {
      setActionError(err.message || "Erreur de génération");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReboot = async () => {
    setActionLoading(true);
    try {
      await api.rebootRouter(routerId);
      setShowRebootConfirm(false);
      alert("Ordre de redémarrage envoyé au routeur MikroTik !");
    } catch (err: any) {
      alert("Erreur lors du redémarrage : " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const winboxAddress = `${router?.vpn?.vpn_server || "vpn.tikzone.net"}:${router?.vpn?.winbox_port || 51005}`;

  const copyWinbox = () => {
    navigator.clipboard.writeText(winboxAddress);
    setCopiedWinbox(true);
    setTimeout(() => setCopiedWinbox(false), 2000);
  };

  const isOnline = telemetry?.online ?? false;

  return (
    <div className="space-y-6">
      {/* SECTION 1: BANDEAU ROUTEUR & ACCÈS WINBOX DIRECT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {router?.name || "Routeur MikroTik"}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isOnline
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                {isOnline ? "En ligne (Connecté)" : "En attente de connexion"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Tunnel WireGuard : <strong className="font-mono text-slate-700 dark:text-slate-200">{router?.vpn?.assigned_ip || "172.29.88.x"}</strong></span>
              <span>•</span>
              <span>Port API Distant : <strong className="font-mono text-slate-700 dark:text-slate-200">{router?.vpn?.api_port || 41005}</strong></span>
            </div>
          </div>
        </div>

        {/* Winbox Direct Access Widget */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <p className="text-[9px] uppercase font-bold text-slate-400">Connexion Winbox</p>
              <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">{winboxAddress}</p>
            </div>
            <button
              type="button"
              onClick={copyWinbox}
              className="ml-1 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Copier pour Winbox"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 cursor-pointer"
            title="Actualiser la télémétrie"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowRebootConfirm(true)}
            className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Redémarrer</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: TÉLÉMÉTRIE MATÉRIELLE ÉPURÉE (Fidèle à la Capture 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Carte 1 : Date & Uptime */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date & Heure Système</p>
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {telemetry?.system_date ? `${telemetry.system_date} ${telemetry.system_time || ""}` : "2026-09-18 20:55:00"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              <span>Uptime : <strong>{telemetry?.uptime || "00:09:13"}</strong></span>
            </p>
          </div>
        </div>

        {/* Carte 2 : Board Name & RouterOS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Matériel & RouterOS</p>
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {telemetry?.board_name || "L009UiGS-2HaxD"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Version : <strong className="text-indigo-600 dark:text-indigo-400">{telemetry?.routeros_version || "7.24.4 (stable)"}</strong>
            </p>
          </div>
        </div>

        {/* Carte 3 : CPU & RAM & HDD */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Charge CPU</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">{telemetry?.cpu_load ?? 28}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(telemetry?.cpu_load ?? 28, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>RAM : <strong>{telemetry?.free_memory || "317.82 Mio"}</strong></span>
              <span>HDD : <strong>{telemetry?.free_hdd || "93.18 Mio"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: CARTES STATISTIQUES HOTSPOT VIBRANTES & TACTILES (Mobile-First) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Wifi className="w-4 h-4 text-blue-600" />
            <span>Indicateurs & Actions Hotspot</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Carte Bleue Vibrante : Sessions Actives */}
          <Link
            href={`/dashboard/routers/${routerId}/active`}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-blue-100/90">Sessions Actives</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Radio className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {hotspot?.active_count ?? 44}
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-300 font-bold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En direct</span>
              </p>
            </div>
          </Link>

          {/* 2. Carte Verte Vibrante : Utilisateurs Enregistrés */}
          <Link
            href={`/dashboard/routers/${routerId}/users`}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-100/90">Total Utilisateurs</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {hotspot?.total_users_count ?? 389}
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 mt-1">
                Tickets & comptes
              </p>
            </div>
          </Link>

          {/* 3. Carte Ambre Vibrante : + Ajouter un Ticket */}
          <button
            type="button"
            onClick={() => {
              setActionSuccess(null);
              setActionError(null);
              setShowAddModal(true);
            }}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-amber-100/90">Création</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm sm:text-base font-black text-white leading-tight">
                + Ajouter Ticket
              </div>
              <p className="text-[10px] sm:text-[11px] text-amber-100/80 mt-0.5">
                Utilisateur unique
              </p>
            </div>
          </button>

          {/* 4. Carte Rose/Rouge Vibrante : ⚡ Générer un Lot */}
          <button
            type="button"
            onClick={() => {
              setActionSuccess(null);
              setActionError(null);
              setShowGenModal(true);
            }}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-rose-100/90">Impression</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm sm:text-base font-black text-white leading-tight">
                ⚡ Générer Lot
              </div>
              <p className="text-[10px] sm:text-[11px] text-rose-100/80 mt-0.5">
                Coupons par lot
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 4: JOURNAUX D'ACTIVITÉ RÉCENTS (Tableau Pro) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Derniers Événements Hotspot (Logs)
            </h3>
          </div>
          <Link
            href={`/dashboard/routers/${routerId}/logs`}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Consulter tout le journal →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Horodatage</th>
                <th className="px-4 py-3">Utilisateur / IP</th>
                <th className="px-4 py-3">Message de l'événement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400 font-sans">
                    Aucun événement récent enregistré sur le routeur.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 8).map((log, idx) => {
                  const msgLower = (log.message || "").toLowerCase();
                  const isSuccess = msgLower.includes("log in") || msgLower.includes("logged in");
                  const isWarning = msgLower.includes("logged out") || msgLower.includes("timeout");
                  const isError = msgLower.includes("failed") || msgLower.includes("invalid");

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.time || "2026-09-18 20:56:13"}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                        {log.message.split(" ")[0] || "1D65693894"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            isSuccess
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : isWarning
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              : isError
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {log.message}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE 1: AJOUTER UN UTILISATEUR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Créer un Utilisateur Hotspot
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom d'utilisateur / Code Ticket *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ex: TIK-84920"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe (laisser vide si code unique)
                </label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Laisser vide pour code unique"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profil de Débit
                  </label>
                  <select
                    value={addProfile}
                    onChange={(e) => setAddProfile(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <option value="default">default</option>
                    {profiles.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} ({p.rate_limit || "Illimité"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Limite Uptime
                  </label>
                  <input
                    type="text"
                    value={addTimeLimit}
                    onChange={(e) => setAddTimeLimit(e.target.value)}
                    placeholder="Ex: 1h, 12h, 1d"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {actionLoading ? "Création..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2: GÉNÉRER UN LOT DE TICKETS */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Générer un Lot de Tickets Hotspot
              </h3>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {actionSuccess}
                </span>
                <Link
                  href={`/dashboard/routers/${routerId}/tickets`}
                  className="underline ml-2"
                >
                  Imprimer le lot →
                </Link>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateBatch} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantité de Tickets
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value) || 10)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prix Unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={genPrice}
                    onChange={(e) => setGenPrice(parseInt(e.target.value) || 100)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profil de Débit
                  </label>
                  <select
                    value={genProfile}
                    onChange={(e) => setGenProfile(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <option value="default">default</option>
                    {profiles.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} ({p.rate_limit || "Illimité"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Durée / Limite Uptime
                  </label>
                  <input
                    type="text"
                    value={genTimeLimit}
                    onChange={(e) => setGenTimeLimit(e.target.value)}
                    placeholder="Ex: 1h, 5h, 1d"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Préfixe (optionnel)
                  </label>
                  <input
                    type="text"
                    value={genPrefix}
                    onChange={(e) => setGenPrefix(e.target.value.toUpperCase())}
                    placeholder="Ex: VIP-"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Longueur du Code
                  </label>
                  <select
                    value={genCodeLength}
                    onChange={(e) => setGenCodeLength(parseInt(e.target.value) || 6)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <option value={4}>4 caractères</option>
                    <option value={5}>5 caractères</option>
                    <option value={6}>6 caractères (Recommandé)</option>
                    <option value={8}>8 caractères</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {actionLoading ? "Génération..." : `Générer ${genCount} tickets`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DE REDÉMARRAGE */}
      {showRebootConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Redémarrer le routeur ?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cette action va redémarrer le boîtier MikroTik distant. La connexion sera interrompue pendant environ 60 secondes.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRebootConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReboot}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
