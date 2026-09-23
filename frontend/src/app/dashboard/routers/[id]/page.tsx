"use client";

import { use, useEffect, useState } from "react";
import { api, RouterData } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  Info,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Server,
  Shield,
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

  const [router, setRouter] = useState<RouterData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tikzone_cached_routers");
        if (cached) {
          const list: RouterData[] = JSON.parse(cached);
          const current = list.find((r) => r.id === routerId);
          if (current) return current;
        }
      } catch {}
    }
    return null;
  });
  const [telemetry, setTelemetry] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_telemetry_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [hotspot, setHotspot] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_hotspot_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [logs, setLogs] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_logs_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [profiles, setProfiles] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_profiles_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_telemetry_${routerId}`);
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedWinbox, setCopiedWinbox] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isEditingHotspotName, setIsEditingHotspotName] = useState(false);
  const [hotspotNameInput, setHotspotNameInput] = useState("");
  const [isSavingHotspotName, setIsSavingHotspotName] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [radiusScriptLoading, setRadiusScriptLoading] = useState(false);
  const [radiusScriptData, setRadiusScriptData] = useState<any>(null);
  const [copiedRadiusScript, setCopiedRadiusScript] = useState(false);

  const handleOpenRadiusModal = async () => {
    setShowRadiusModal(true);
    if (!radiusScriptData) {
      setRadiusScriptLoading(true);
      try {
        const data = await api.getRadiusSetupScript(routerId);
        setRadiusScriptData(data);
      } catch (err: any) {
        console.error("Erreur RADIUS:", err);
      } finally {
        setRadiusScriptLoading(false);
      }
    }
  };

  const handleCopyRadiusScript = () => {
    if (radiusScriptData?.script) {
      navigator.clipboard.writeText(radiusScriptData.script);
      setCopiedRadiusScript(true);
      setTimeout(() => setCopiedRadiusScript(false), 2500);
    }
  };

  // Formulaire Identifiants MikroTik (API)
  const [apiUserInput, setApiUserInput] = useState("admin");
  const [apiPasswordInput, setApiPasswordInput] = useState("");
  const [showApiPassword, setShowApiPassword] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

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

      if (Array.isArray(routersList) && routersList.length > 0) {
        try {
          localStorage.setItem("tikzone_cached_routers", JSON.stringify(routersList));
        } catch {}
      }
      const current = routersList.find((r) => r.id === routerId);
      if (current) {
        setRouter(current);
        if (current.api_user) setApiUserInput(current.api_user);
        if (typeof current.api_password === "string") setApiPasswordInput(current.api_password);
      }
      if (sysInfo) {
        setTelemetry(sysInfo);
        try {
          localStorage.setItem(`tikzone_cached_telemetry_${routerId}`, JSON.stringify(sysInfo));
        } catch {}
      }
      if (hsOverview) {
        setHotspot(hsOverview);
        try {
          localStorage.setItem(`tikzone_cached_hotspot_${routerId}`, JSON.stringify(hsOverview));
        } catch {}
      }
      if (logList) {
        const parsedLogs = logList.results || logList;
        setLogs(parsedLogs);
        try {
          localStorage.setItem(`tikzone_cached_logs_${routerId}`, JSON.stringify(parsedLogs));
        } catch {}
      }
      if (profList?.results) {
        setProfiles(profList.results);
        try {
          localStorage.setItem(`tikzone_cached_profiles_${routerId}`, JSON.stringify(profList.results));
        } catch {}
      }
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
      setActionSuccess("Ordre de redémarrage matériel transmis avec succès ! Le routeur sera de nouveau joignable d'ici 60 à 90 secondes.");
      setTimeout(() => setActionSuccess(null), 9000);
    } catch (err: any) {
      alert("Erreur lors du redémarrage : " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const rawVpnServer = router?.vpn?.vpn_server;
  const winboxHost = rawVpnServer && !rawVpnServer.includes(":") && rawVpnServer !== "vpn.tikzone.net" ? rawVpnServer : "187.7.20.53";
  const winboxAddress = `${winboxHost}:${router?.vpn?.winbox_port || 51001}`;

  const copyWinbox = () => {
    navigator.clipboard.writeText(winboxAddress);
    setCopiedWinbox(true);
    setTimeout(() => setCopiedWinbox(false), 2000);
  };

  const handleSaveHotspotName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotspotNameInput.trim()) return;
    setIsSavingHotspotName(true);
    try {
      const res = await api.updateRouter(routerId, { hotspot_name: hotspotNameInput.trim() });
      setRouter(res.router);
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("tikzone_cached_routers");
          if (cached) {
            const list = JSON.parse(cached);
            const idx = list.findIndex((r: any) => r.id === routerId);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...res.router };
              localStorage.setItem("tikzone_cached_routers", JSON.stringify(list));
            }
          }
        } catch {}
      }
      setIsEditingHotspotName(false);
    } catch (err: any) {
      alert("Erreur lors de la modification : " + err.message);
    } finally {
      setIsSavingHotspotName(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCredentials(true);
    setActionError(null);
    try {
      const res = await api.updateRouter(routerId, {
        api_user: apiUserInput.trim() || "admin",
        api_password: apiPasswordInput,
      });
      setRouter(res.router);
      setShowCredentialsModal(false);
      setActionSuccess("Identifiants MikroTik enregistrés ! Tentative de connexion...");
      setTimeout(() => setActionSuccess(null), 5000);
      await loadData();
    } catch (err: any) {
      alert("Erreur lors de la mise à jour des identifiants : " + (err.message || "Erreur inconnue"));
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const isOnline = telemetry?.online ?? false;
  const routerDisplayName = router?.hotspot_name || router?.name || "";

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
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                {isEditingHotspotName ? (
                  <form onSubmit={handleSaveHotspotName} className="flex items-center gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={hotspotNameInput}
                      onChange={(e) => setHotspotNameInput(e.target.value)}
                      placeholder="Nom du Hotspot"
                      className="px-2.5 py-1 text-sm bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl text-slate-900 dark:text-white focus:outline-hidden font-bold"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isSavingHotspotName}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {isSavingHotspotName ? "..." : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingHotspotName(false)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </form>
                ) : (
                  <>
                    {routerDisplayName ? (
                      <span>{routerDisplayName}</span>
                    ) : (
                      <span className="inline-block h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    )}
                    {routerDisplayName && (
                      <button
                        type="button"
                        onClick={() => {
                          setHotspotNameInput(router?.hotspot_name || router?.name || "");
                          setIsEditingHotspotName(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Personnaliser le nom commercial de ce Hotspot"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
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
              {router?.hotspot_name && (
                <>
                  <span>Matériel : <strong className="font-mono text-slate-700 dark:text-slate-200">{router.name}</strong></span>
                  <span>•</span>
                </>
              )}
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
            onClick={() => setShowCredentialsModal(true)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
            title="Modifier les identifiants MikroTik"
          >
            <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

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

      {/* Action Success Alert Banner */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* BANDEAU D'ONBOARDING : ROUTEUR EN ATTENTE DE CONNEXION */}
      {!loading && !isOnline && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Routeur en attente de connexion
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Ce MikroTik n'est pas encore relié à TikZone. Pour activer la télémétrie et les tickets, appliquez le script ci-dessous dans votre terminal Winbox.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-nowrap self-start sm:self-center">
              <div className="relative group">
                <button
                  type="button"
                  title="Consulter et modifier les identifiants d'accès API de votre MikroTik"
                  onClick={() => setShowCredentialsModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Mes identifiants MikroTik</span>
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-30 pointer-events-none">
                  <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
                    Consulter et modifier vos identifiants API MikroTik
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  title={
                    router?.hotspot_type === "RADIUS"
                      ? "Copier le script complet (VPN WireGuard + Client RADIUS) pour WinBox"
                      : "Copier le script complet d'initialisation pour New Terminal WinBox"
                  }
                  onClick={() => {
                    const scriptToCopy = router?.vpn?.mikrotik_script || router?.script || "";
                    if (scriptToCopy) {
                      navigator.clipboard.writeText(scriptToCopy);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    } else {
                      alert("Script introuvable. Veuillez recharger la page.");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl border border-amber-700/50 shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript ? "Script copié !" : "Copier le script"}</span>
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-30 pointer-events-none">
                  <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
                    {router?.hotspot_type === "RADIUS"
                      ? "Copier le script complet (VPN WireGuard + Client RADIUS) pour New Terminal"
                      : "Copier le script d'initialisation pour New Terminal WinBox"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-black text-amber-600">Étape 1</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Ouvrez Winbox sur votre PC et connectez-vous au routeur</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-black text-amber-600">Étape 2</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Cliquez sur le menu <strong>New Terminal</strong> à gauche</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-black text-amber-600">Étape 3</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Collez le script et appuyez sur Entrée (le voyant passera au vert)</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: TÉLÉMÉTRIE MATÉRIELLE ÉPURÉE (Compacte sur une seule ligne) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Carte 1 : Date & Uptime */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Date & Heure</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              {telemetry?.system_date ? (
                `${telemetry.system_date} ${telemetry.system_time || ""}`
              ) : loading ? (
                <span className="inline-block h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">
                {telemetry?.uptime ? (
                  <strong>{telemetry.uptime}</strong>
                ) : loading ? (
                  <span className="inline-block h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  "—"
                )}
              </span>
            </p>
          </div>
        </div>

        {/* Carte 2 : Board Name & RouterOS */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Système & RouterOS</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              {telemetry?.board_name ? (
                telemetry.board_name
              ) : loading ? (
                <span className="inline-block h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                router?.name || "MikroTik"
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              v{telemetry?.routeros_version ? (
                <strong className="text-indigo-600 dark:text-indigo-400">{telemetry.routeros_version}</strong>
              ) : loading ? (
                <span className="inline-block h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {/* Carte 3 : CPU & RAM */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Charge CPU</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {typeof telemetry?.cpu_load === "number" ? (
                  `${telemetry.cpu_load}%`
                ) : loading ? (
                  <span className="inline-block h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(telemetry?.cpu_load ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>
                RAM : <strong>{telemetry?.free_memory || (loading ? "..." : "—")}</strong>
              </span>
              <span>
                HDD : <strong>{telemetry?.free_hdd || (loading ? "..." : "—")}</strong>
              </span>
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
                {typeof hotspot?.active_count === "number" ? (
                  hotspot.active_count
                ) : loading ? (
                  <span className="inline-block h-8 w-12 bg-white/20 rounded animate-pulse" />
                ) : (
                  0
                )}
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
                {typeof hotspot?.total_users_count === "number" ? (
                  hotspot.total_users_count
                ) : loading ? (
                  <span className="inline-block h-8 w-14 bg-white/20 rounded animate-pulse" />
                ) : (
                  0
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 mt-1">
                Tickets & comptes
              </p>
            </div>
          </Link>

          {/* 3. Carte Indigo/Violette Vibrante : Recette Journalière (Aujourd'hui) */}
          <Link
            href={`/dashboard/routers/${routerId}/reports`}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-indigo-100/90">Recette du Jour</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Coins className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {typeof hotspot?.today_revenue === "number" ? (
                  `${hotspot.today_revenue.toLocaleString("fr-FR")} F`
                ) : loading ? (
                  <span className="inline-block h-8 w-16 bg-white/20 rounded animate-pulse" />
                ) : (
                  "0 FCFA"
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-indigo-200 mt-1 flex items-center gap-1 font-medium">
                <span>Ventes encaissées</span>
                <span className="text-white/60">→</span>
              </p>
            </div>
          </Link>

          {/* 4. Carte Ambre Vibrante : Profils Hotspot & Forfaits */}
          <Link
            href={`/dashboard/routers/${routerId}/profiles`}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-amber-100/90">Profils Hotspot</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm sm:text-base font-black text-white leading-tight">
                + Profils & Forfaits
              </div>
              <p className="text-[10px] sm:text-[11px] text-amber-100/80 mt-0.5">
                Débits, Prix & Validités
              </p>
            </div>
          </Link>
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
                <th className="px-4 py-3">Utilisateur / Ticket</th>
                <th className="px-4 py-3">Adresse IP</th>
                <th className="px-4 py-3">Message de l'événement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-sans">
                    Aucun événement récent enregistré sur le routeur.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 8).map((log, idx) => {
                  const msgLower = (log.message || "").toLowerCase();
                  const isSuccess = msgLower.includes("log in") || msgLower.includes("logged in");
                  const isWarning = msgLower.includes("logged out") || msgLower.includes("timeout");
                  const isError = msgLower.includes("failed") || msgLower.includes("invalid");

                  const displayUser = log.user && log.user !== "-" ? log.user : (log.message.split(" ")[0] || "-");
                  const displayIp = log.ip && log.ip !== "-" ? log.ip : "-";

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.time || "2026-09-18 20:56:13"}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs">
                          {displayUser}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs">
                        {displayIp}
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto py-8 sm:py-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 m-auto">
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
                    {profiles
                      .filter((p) => p.name?.toLowerCase() !== "default")
                      .map((p) => (
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto py-8 sm:py-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 m-auto">
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
                    {profiles
                      .filter((p) => p.name?.toLowerCase() !== "default")
                      .map((p) => (
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

      {/* CONFIRMATION DE REDÉMARRAGE SÉCURISÉE */}
      {showRebootConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Confirmer le redémarrage matériel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Routeur : <strong className="text-slate-800 dark:text-slate-200">{routerDisplayName}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 space-y-2.5 text-xs text-rose-950 dark:text-rose-200">
              <p className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Conséquences immédiates de cette opération :</span>
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed text-rose-900/90 dark:text-rose-200/90">
                <li><strong>Coupure du Wi-Fi :</strong> Toutes les sessions utilisateurs actuellement connectées au Hotspot seront interrompues.</li>
                <li><strong>Temps d'arrêt :</strong> Le routeur sera injoignable pendant environ <strong>60 à 90 secondes</strong>.</li>
                <li><strong>Rétablissement automatique :</strong> Le tunnel VPN TikZone et le portail Hotspot se relanceront automatiquement au boot.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRebootConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReboot}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                <span>{actionLoading ? "Envoi de l'ordre..." : "Confirmer le redémarrage"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURATION IDENTIFIANTS API MIKROTIK */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Accès API MikroTik
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Routeur : <strong className="text-slate-800 dark:text-slate-200">{routerDisplayName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Renseignez les identifiants d'administration configurés sur votre routeur MikroTik (ceux utilisés avec Winbox). TikZone s'y connecte de manière sécurisée via le tunnel WireGuard.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nom d'utilisateur (Login) *
                </label>
                <input
                  type="text"
                  required
                  value={apiUserInput}
                  onChange={(e) => setApiUserInput(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mot de passe MikroTik
                </label>
                <div className="relative">
                  <input
                    type={showApiPassword ? "text" : "password"}
                    value={apiPasswordInput}
                    onChange={(e) => setApiPasswordInput(e.target.value)}
                    placeholder="Laisser vide si aucun mot de passe"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiPassword(!showApiPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showApiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Par défaut sur RouterOS neuf, le mot de passe est vide.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  disabled={isSavingCredentials}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingCredentials}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingCredentials ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      <span>Enregistrer et Tester</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuration RADIUS MikroTik 1-Clic */}
      {showRadiusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Raccordement RADIUS MikroTik 1-Clic
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copiez et collez ce script dans le Terminal WinBox / WebFig de votre routeur.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRadiusModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {radiusScriptLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Génération du script sur mesure en cours...
              </div>
            ) : radiusScriptData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Serveur RADIUS TikZone</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {radiusScriptData.radius_server_ip}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Ports Auth / Accounting</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      UDP {radiusScriptData.radius_auth_port} / {radiusScriptData.radius_acct_port}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {radiusScriptData.script}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyRadiusScript}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedRadiusScript ? "Copié !" : "Copier le script"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    Instructions d'installation :
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800 dark:text-blue-300">
                    <li>Ouvrez <strong>WinBox</strong> et connectez-vous à votre MikroTik.</li>
                    <li>Ouvrez le menu <strong>New Terminal</strong>.</li>
                    <li>Collez la commande ci-dessus avec un clic-droit et validez par Entrée.</li>
                    <li>Votre routeur authentifie désormais vos tickets Hotspot via TikZone !</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-rose-500">
                Impossible de charger le script de configuration RADIUS.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
