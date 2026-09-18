"use client";

import CopyButton from "@/components/CopyButton";
import MikhmonLaunchModal from "@/components/MikhmonLaunchModal";
import { api, InstanceData, RouterData } from "@/lib/api";
import { BASE_DOMAIN } from "@/lib/config";
import { formatFCFA } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Router as RouterIcon,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ClientDashboardPage() {
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING">("ALL");
  const [pingStatus, setPingStatus] = useState<Record<string, string>>({});
  const [showScriptModal, setShowScriptModal] = useState<string | null>(null);
  const [selectedMikhmonModal, setSelectedMikhmonModal] = useState<InstanceData | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // État de confirmation de suppression
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "SPACE" | "ROUTER";
    id: string;
    name: string;
    routersCount?: number;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInstances();
      setInstances(data || []);
    } catch {
      // Ignorer si pas encore connecté
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`"${label}" copié dans le presse-papier !`, "success");
  };

  const handlePing = async (routerId: string) => {
    setPingStatus((prev) => ({ ...prev, [routerId]: "testing" }));
    try {
      const res = await api.pingRouter(routerId);
      setPingStatus((prev) => ({ ...prev, [routerId]: "online" }));
      showToast(res.detail || "Routeur en ligne !", "success");
    } catch (err: any) {
      setPingStatus((prev) => ({ ...prev, [routerId]: "offline" }));
      showToast(err.message || "Le routeur ne répond pas au ping.", "error");
    } finally {
      setTimeout(() => setPingStatus((prev) => ({ ...prev, [routerId]: "" })), 4000);
    }
  };

  const handleRenewRouter = async (routerId: string) => {
    try {
      const res = await api.renewRouter(routerId);
      showToast(res.detail || "Routeur renouvelé pour 30 jours !", "success");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors du renouvellement", "error");
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "SPACE") {
      if (deleteTarget.routersCount && deleteTarget.routersCount > 0) {
        showToast(
          `Impossible de supprimer l'espace '${deleteTarget.name}' : il contient encore ${deleteTarget.routersCount} routeur(s) associé(s). Supprimez-les d'abord.`,
          "error"
        );
        setDeleteTarget(null);
        return;
      }

      try {
        const res = await api.deleteInstance(deleteTarget.id);
        showToast(res.detail || "Espace supprimé avec succès !", "success");
        setInstances((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      } catch (err: any) {
        showToast(err.message || "Erreur lors de la suppression de l'espace", "error");
      }
    } else if (deleteTarget.type === "ROUTER") {
      try {
        const res = await api.deleteRouter(deleteTarget.id);
        showToast(res.detail || "Routeur supprimé avec succès !", "success");
        setInstances((prev) =>
          prev.map((inst) => ({
            ...inst,
            routers: (inst.routers || []).filter((r) => r.id !== deleteTarget.id),
          }))
        );
      } catch (err: any) {
        showToast(err.message || "Erreur lors de la suppression du routeur", "error");
      }
    }

    setDeleteTarget(null);
  };

  const totalRoutersCount = instances.reduce((acc, inst) => acc + (inst.routers ? inst.routers.length : 0), 0);
  const expiringRoutersCount = instances
    .flatMap((inst) => inst.routers || [])
    .filter((r) => r.days_left <= 7).length;

  const filteredInstances = instances
    .map((inst) => {
      let filteredRouters = (inst.routers || []).filter((r) => {
        if (activeFilter === "EXPIRING") {
          return r.days_left <= 7;
        }
        return true;
      });

      if (searchTerm) {
        filteredRouters = filteredRouters.filter(
          (r) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.vpn?.api_port && r.vpn.api_port.toString().includes(searchTerm))
        );
      }

      return { ...inst, routers: filteredRouters };
    })
    .filter((inst) => (inst.routers && inst.routers.length > 0) || (activeFilter === "ALL" && !searchTerm));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-700"
              : "bg-rose-600 text-white border border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Espaces Mikhmon
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{instances.length}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Sous-domaines opérationnels</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Server className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Routeurs Connectés
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalRoutersCount}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Tunnels VPN RouterOS 7 actifs</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <RouterIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Renouvellements (&lt; 7j)
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{expiringRoutersCount}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">À prolonger prochainement</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>Tous les Espaces ({instances.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter("EXPIRING")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "EXPIRING"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>À renouveler ({expiringRoutersCount})</span>
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher espace, routeur, port..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mikhmon Spaces & Routers Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-xs text-slate-500">
            Chargement de vos espaces et routeurs en cours...
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Aucun espace trouvé</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Créez un nouvel espace pour commencer à relier vos routeurs MikroTik.
              </p>
            </div>
            <Link
              href="/dashboard/mikhmon/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Acheter un Espace (1 000 CFA)</span>
            </Link>
          </div>
        ) : (
          filteredInstances.map((instance) => {
            const routers = instance.routers || [];

            return (
              <div
                key={instance.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Space Header */}
                <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                        <Server className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-black text-sm sm:text-lg text-slate-900 dark:text-white break-all">
                            {instance.name}.{BASE_DOMAIN}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            ROS {instance.routeros_version}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[10px] sm:text-[11px]">
                            <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>admin / <strong>{instance.admin_password || "123"}</strong></span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
                            {routers.length} routeur(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Space Button (accessible on mobile top right) */}
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: "SPACE",
                          id: instance.id,
                          name: instance.name,
                          routersCount: routers.length,
                        })
                      }
                      className="lg:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Supprimer cet espace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Link
                      href={`/dashboard/routers/new?space=${instance.id}`}
                      className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Ajouter Routeur</span>
                    </Link>

                    {routers.length > 0 ? (
                      <Link
                        href={`/dashboard/routers/${routers[0].id}`}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        title="Ouvrir l'Espace Hotspot de ce routeur"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Espace Hotspot</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/routers/new?space=${instance.id}`}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Rattacher Routeur</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: "SPACE",
                          id: instance.id,
                          name: instance.name,
                          routersCount: routers.length,
                        })
                      }
                      className="hidden lg:inline-flex p-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer cet espace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Routers Grid */}
                <div className="p-4 sm:p-6 space-y-4">
                  {routers.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Aucun routeur rattaché à cet espace pour le moment.
                      </p>
                      <Link
                        href={`/dashboard/routers/new?space=${instance.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Rattacher un routeur MikroTik (500 CFA/mois)</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                      {routers.map((router) => {
                        const daysLeft = router.days_left ?? 30;
                        const isExpiringSoon = daysLeft <= 7;

                        const vpnServer = router.vpn?.vpn_server || "vpn.tikzone.net";
                        const apiPort = router.vpn?.api_port || 41001;
                        const winboxPort = router.vpn?.winbox_port || 51001;
                        const apiEndpoint = `${vpnServer}:${apiPort}`;
                        const winboxEndpoint = `${vpnServer}:${winboxPort}`;

                        return (
                          <div
                            key={router.id}
                            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all space-y-3.5 shadow-2xs"
                          >
                            {/* Router Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0"></span>
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                    {router.name}
                                  </h4>
                                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    Tunnel WireGuard / L2TP
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black rounded-full border shrink-0 ${
                                  isExpiringSoon
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                }`}
                              >
                                {daysLeft}j restants
                              </span>
                            </div>

                            {/* Actions Responsive Layout */}
                            <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <Link
                                href={`/dashboard/routers/${router.id}`}
                                className="col-span-4 sm:flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                              >
                                <Wifi className="w-3.5 h-3.5" />
                                <span>Gérer le Hotspot</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  setShowScriptModal(
                                    router.vpn?.mikrotik_script ||
                                      router.script ||
                                      `/interface l2tp-client add connect-to=vpn.tikzone.net name=${router.name}-VPN user=${router.name} password=secret disabled=no\n/ip firewall filter add action=accept chain=input in-interface=${router.name}-VPN comment="TikZone VPN"`
                                  )
                                }
                                className="col-span-2 sm:col-auto py-2 px-2.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                              >
                                Script
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRenewRouter(router.id)}
                                className="py-2 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                                title="Prolonger de 30 jours (500 FCFA)"
                              >
                                +30j
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePing(router.id)}
                                disabled={pingStatus[router.id] === "testing"}
                                className="py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                {pingStatus[router.id] === "testing" ? (
                                  <span className="text-[11px]">Test...</span>
                                ) : pingStatus[router.id] === "online" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">OK</span>
                                ) : (
                                  <span className="text-[11px]">Ping</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "ROUTER",
                                    id: router.id,
                                    name: router.name,
                                  })
                                }
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                title="Supprimer ce routeur"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-black text-base">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h3>Script MikroTik VPN L2TP</h3>
              </div>
              <button
                onClick={() => setShowScriptModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ouvrez Winbox, allez dans <strong>New Terminal</strong> et collez le script ci-dessous :
            </p>

            <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{showScriptModal}</pre>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-emerald-900 dark:text-emerald-300 font-medium">
                Besoin d'aide pour injecter ce script sur votre boîtier MikroTik ?
              </span>
              <a
                href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27aide%20pour%20configurer%20le%20script%20VPN%20MikroTik"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shrink-0 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Aide WhatsApp (+223 99 28 18 99)</span>
              </a>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowScriptModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Fermer
              </button>
              <CopyButton text={showScriptModal} label="Copier le script complet" />
            </div>

          </div>
        </div>
      )}

      {/* Mikhmon Launch & Session Helper Modal */}
      {selectedMikhmonModal && (
        <MikhmonLaunchModal
          instance={selectedMikhmonModal}
          onClose={() => setSelectedMikhmonModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3>Confirmer la suppression</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {deleteTarget.type === "SPACE" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer l'espace Mikhmon <strong>{deleteTarget.name}</strong> ?
                  {deleteTarget.routersCount && deleteTarget.routersCount > 0 ? (
                    <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400">
                      ⚠️ Attention : Cet espace contient {deleteTarget.routersCount} routeur(s). Vous devez supprimer ses routeurs avant de pouvoir supprimer l'espace.
                    </span>
                  ) : (
                    <span className="block mt-2 text-slate-500">
                      Cet espace est vide et sera supprimé définitivement.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer le routeur <strong>{deleteTarget.name}</strong> ? Ses ports VPN seront immédiatement libérés.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
