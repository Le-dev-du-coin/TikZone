"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  HardDrive,
  Layers,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Smartphone,
  Ticket,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Palette de couleurs vives harmonieuses fidèle à la capture
const CARD_PALETTES = [
  { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-500", glow: "shadow-indigo-600/20" },
  { bg: "bg-sky-500", text: "text-white", border: "border-sky-400", glow: "shadow-sky-500/20" },
  { bg: "bg-purple-600", text: "text-white", border: "border-purple-500", glow: "shadow-purple-600/20" },
  { bg: "bg-violet-600", text: "text-white", border: "border-violet-500", glow: "shadow-violet-600/20" },
  { bg: "bg-blue-600", text: "text-white", border: "border-blue-500", glow: "shadow-blue-600/20" },
  { bg: "bg-amber-500", text: "text-white", border: "border-amber-400", glow: "shadow-amber-500/20" },
  { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-400", glow: "shadow-emerald-500/20" },
  { bg: "bg-fuchsia-600", text: "text-white", border: "border-fuchsia-500", glow: "shadow-fuchsia-600/20" },
  { bg: "bg-teal-500", text: "text-white", border: "border-teal-400", glow: "shadow-teal-500/20" },
];

function formatDuration(seconds: number | string | undefined): string {
  if (!seconds || seconds === "0" || seconds === "-") return "0s";
  const sec = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  if (isNaN(sec) || sec <= 0) return "0s";
  const days = Math.floor(sec / 86400);
  const rem = sec % 86400;
  const hours = Math.floor(rem / 3600);
  const rem2 = rem % 3600;
  const minutes = Math.floor(rem2 / 60);
  const s = rem2 % 60;
  if (days > 0) return hours > 0 ? `${days}j ${hours}h` : `${days}j`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return s > 0 && minutes < 5 ? `${minutes}m ${s}s` : `${minutes}m`;
  return `${s}s`;
}

function formatBytes(bytesVal: number | string | undefined): string {
  if (!bytesVal || bytesVal === "0" || bytesVal === "-") return "0 Mo";
  const num = typeof bytesVal === "string" ? parseFloat(bytesVal) : bytesVal;
  if (isNaN(num) || num <= 0) return "0 Mo";
  if (num >= 1024 * 1024 * 1024) return `${(num / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  if (num >= 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} Mo`;
  if (num >= 1024) return `${Math.round(num / 1024)} Ko`;
  return `${Math.round(num)} B`;
}

export default function RouterUsersPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [users, setUsers] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_users_${routerId}`);
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

  const [loading, setLoading] = useState(() => users.length === 0);
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");
  const [selectedProfile, setSelectedProfile] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Sélection multiple par cases à cocher
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Modale de génération de tickets par lot
  const [showGenModal, setShowGenModal] = useState(false);
  const [genCount, setGenCount] = useState(20);
  const [genAuthMode, setGenAuthMode] = useState<"single" | "dual">("single");
  const [genProfile, setGenProfile] = useState("");
  const [genTimeLimit, setGenTimeLimit] = useState("3h");
  const [genCodeLength, setGenCodeLength] = useState<4 | 6 | 8>(6);
  const [genCodeFormat, setGenCodeFormat] = useState<"numeric" | "alpha_upper" | "alpha_lower">("numeric");
  const [genPrefix, setGenPrefix] = useState("");
  const [genPrice, setGenPrice] = useState(100);
  const [genComment, setGenComment] = useState("");

  // Impression des tickets
  const [routerData, setRouterData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tikzone_cached_routers");
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((r: any) => r.id === routerId);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  });
  const [printTickets, setPrintTickets] = useState<any[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrintTickets = (ticketList: any[]) => {
    if (!ticketList || ticketList.length === 0) {
      alert("Aucun ticket à imprimer pour cette sélection.");
      return;
    }
    setPrintTickets(ticketList);
  };

  const handleDownloadPdf = async (targetProfile?: string) => {
    setIsDownloadingPdf(true);
    setActionError(null);
    try {
      const prof = targetProfile || (selectedProfile !== "ALL" ? selectedProfile : undefined);
      const ticketIds = printTickets.map((t) => t.id).filter(Boolean);
      await api.downloadTicketsPdf(routerId, prof, ticketIds.length > 0 ? ticketIds : undefined);
      setActionSuccess("Fichier PDF vectoriel généré et téléchargé avec succès !");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError("Erreur de téléchargement PDF : " + (err.message || "Échec serveur"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Notifications
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 100% Cloud Hotspot Natif : seuls les tickets Cloud sont gérés
      const [saasRes, profRes, routersList] = await Promise.all([
        api.getSaaSTickets(routerId).catch(() => ({ results: [] })),
        api.getRouterProfiles(routerId, { active_only: true }).catch(() => ({ results: [] })),
        api.getRouters().catch(() => []),
      ]);
      if (Array.isArray(routersList) && routersList.length > 0) {
        const found = routersList.find((r: any) => r.id === routerId);
        if (found) setRouterData(found);
      }

      const parsedSaaSTickets = (saasRes.results || []).map((t: any) => ({
        id: t.id,
        name: t.code,
        password: t.password,
        profile: t.profile || "",
        comment: t.comment || "Ticket Cloud Hotspot",
        uptime: t.uptime_formatted || (t.uptime_used_seconds ? formatDuration(t.uptime_used_seconds) : "0s"),
        remaining: t.remaining_formatted || (t.remaining_seconds ? formatDuration(t.remaining_seconds) : "0s"),
        uptime_used_seconds: t.uptime_used_seconds || 0,
        remaining_seconds: t.remaining_seconds || 0,
        bytes_in: t.bytes_in || 0,
        bytes_out: t.bytes_out || 0,
        bytes_in_formatted: t.bytes_in_formatted || formatBytes(t.bytes_in),
        bytes_out_formatted: t.bytes_out_formatted || formatBytes(t.bytes_out),
        total_traffic_formatted: t.total_traffic_formatted || formatBytes((t.bytes_in || 0) + (t.bytes_out || 0)),
        source: "saas",
        status: t.status || "NEW",
        price: t.price,
        time_limit: t.time_limit,
        time_limit_seconds: t.time_limit_seconds,
        created_at: t.created_at,
        first_login_at: t.first_login_at,
        last_login_at: t.last_login_at,
        expires_at: t.expires_at,
        mac_address: t.mac_address || "",
      }));

      // Suppression stricte et totale de tout profil "default" fantôme
      const parsedProfiles = (profRes.results || []).filter(
        (p: any) => p.name && p.name.trim().toLowerCase() !== "default"
      );

      setUsers(parsedSaaSTickets);
      setProfiles(parsedProfiles);

      try {
        localStorage.setItem(`tikzone_cached_users_${routerId}`, JSON.stringify(parsedSaaSTickets));
        localStorage.setItem(`tikzone_cached_profiles_${routerId}`, JSON.stringify(parsedProfiles));
      } catch {}
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routerId]);

  // Décompte universel et tolérant des tickets par profil
  const getTicketsForProfile = (pName: string, pTimeout?: string) => {
    const targetName = (pName || "").trim().toLowerCase();
    const targetTimeout = (pTimeout || "").trim().toLowerCase();

    return users.filter((u) => {
      const uProf = (u.profile || "").trim().toLowerCase();
      const uLimit = (u.time_limit || "").trim().toLowerCase();

      // 1. Match direct par nom de forfait (insensible à la casse)
      if (uProf === targetName) return true;

      // 2. Tolérance pour les tickets ayant le format durée (ex: "3h", "6h", "24h")
      if (targetTimeout && (uProf === targetTimeout || uLimit === targetTimeout)) {
        return true;
      }

      return false;
    });
  };

  // Filtrage des tickets pour la vue tableau
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.comment && u.comment.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedProfile === "ALL") return true;

    const currentProfObj = profiles.find((p) => p.name === selectedProfile);
    const pName = selectedProfile.trim().toLowerCase();
    const pTimeout = (currentProfObj?.session_timeout || "").trim().toLowerCase();

    const uProf = (u.profile || "").trim().toLowerCase();
    const uLimit = (u.time_limit || "").trim().toLowerCase();

    if (uProf === pName) return true;
    if (pTimeout && (uProf === pTimeout || uLimit === pTimeout)) return true;

    return false;
  });

  // Gestion de la sélection multiple
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set<string>();
      filteredUsers.forEach((u) => {
        if (u.id) allIds.add(u.id);
      });
      setSelectedIds(allIds);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Suppression groupée des tickets sélectionnés
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Supprimer définitivement ${count} ticket(s) sélectionné(s) ?`)) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);
    try {
      const selectedUsersList = users.filter((u) => selectedIds.has(u.id));
      const saasIds = selectedUsersList.filter((u) => u.source === "saas").map((u) => u.id);
      const routerOsIds = selectedUsersList.filter((u) => u.source !== "saas").map((u) => u.id);

      if (saasIds.length > 0) {
        await api.deleteSaaSTickets(routerId, saasIds);
      }
      if (routerOsIds.length > 0) {
        await api.deleteRouterHotspotUsers(routerId, routerOsIds);
      }

      setActionSuccess(`${count} ticket(s) supprimé(s) avec succès !`);
      setSelectedIds(new Set());
      await loadData();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError("Erreur lors de la suppression : " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Ouverture du générateur par lot pré-rempli
  const handleOpenGenerateModal = (targetProfileName?: string) => {
    setActionSuccess(null);
    setActionError(null);

    const activeProf =
      targetProfileName && targetProfileName !== "ALL"
        ? targetProfileName
        : profiles[0]?.name || "";

    setGenProfile(activeProf);

    const profObj = profiles.find((p) => p.name === activeProf);
    if (profObj) {
      if (profObj.session_timeout && profObj.session_timeout !== "Illimitée" && profObj.session_timeout !== "-") {
        setGenTimeLimit(profObj.session_timeout);
      }
      if (profObj.price) {
        const num = parseInt(profObj.price.toString().replace(/\D/g, ""));
        if (!isNaN(num) && num > 0) setGenPrice(num);
      }
    }

    setShowGenModal(true);
  };

  // Génération de tickets par lot
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await api.generateSaaSTickets(routerId, {
        count: Math.min(Math.max(genCount, 1), 1000),
        auth_mode: genAuthMode,
        profile: genProfile,
        time_limit: genTimeLimit.trim(),
        prefix: genPrefix.trim(),
        code_length: genCodeLength,
        code_format: genCodeFormat,
        price: genPrice,
        comment: genComment.trim(),
      });
      setActionSuccess(`${res.count || genCount} tickets générés avec succès dans le Cloud !`);
      setShowGenModal(false);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || "Erreur de génération des tickets");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            {viewMode === "TABLE" && (
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors mr-1"
                title="Revenir aux cartes des profils"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>
                {viewMode === "CARDS"
                  ? "Tickets Hotspot"
                  : selectedProfile === "ALL"
                  ? "Tous les Tickets (Tous Profils)"
                  : `Tickets du Profil : ${selectedProfile}`}
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === "CARDS"
              ? "Sélectionnez un forfait pour explorer ses tickets, ou lancez une génération ciblée."
              : `${filteredUsers.length} ticket(s) trouvé(s) — Cochez pour supprimer en lot.`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === "TABLE" && (
            <>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Vue par Profils</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintTickets(filteredUsers)}
                className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Imprimer les tickets de cette vue"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Imprimer ({filteredUsers.length})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            title="Actualiser les tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => handleOpenGenerateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Générer des Tickets</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VUE 1 : GRILLE DES CARTES DE PROFILS (Fidèle à la Capture) */}
      {/* ========================================================= */}
      {viewMode === "CARDS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Sélectionnez une catégorie pour consulter ses tickets ou générer un lot</span>
            <span>Total : {users.length} tickets en base</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Carte 1 : TOUS LES PROFILS */}
            <div
              className={`rounded-2xl p-4 sm:p-5 ${CARD_PALETTES[0].bg} ${CARD_PALETTES[0].text} shadow-lg ${CARD_PALETTES[0].glow} flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Tous les Profils
                  </h3>
                  <div className="text-2xl font-black mt-1 font-mono tracking-tight">
                    {users.length} Tickets
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-4 mt-3 border-t border-white/20 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfile("ALL");
                    setViewMode("TABLE");
                  }}
                  className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenGenerateModal("ALL")}
                  className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Générer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintTickets(users)}
                  className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Imprimer tous les tickets"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            {/* Cartes par Profil individuel */}
            {profiles.map((p, idx) => {
              const palette = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length];
              const matchingTickets = getTicketsForProfile(p.name, p.session_timeout);
              const count = matchingTickets.length;

              return (
                <div
                  key={p.id || p.name || idx}
                  className={`rounded-2xl p-4 sm:p-5 ${palette.bg} ${palette.text} shadow-lg ${palette.glow} flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 truncate">
                        Profil : {p.name}
                      </h3>
                      <div className="text-2xl font-black mt-1 font-mono tracking-tight">
                        {count} {count > 1 ? "Tickets" : "Ticket"}
                      </div>
                      <div className="text-[11px] text-white/80 font-medium mt-0.5 truncate">
                        {p.price || "100 FCFA"} • {p.session_timeout || "Illimité"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-4 mt-3 border-t border-white/20 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfile(p.name);
                        setViewMode("TABLE");
                      }}
                      className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenGenerateModal(p.name)}
                      className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Générer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintTickets(matchingTickets)}
                      className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title={`Imprimer les tickets du profil ${p.name}`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : TABLEAU DÉTAILLÉ AVEC CASES À COCHER & SUPPRESSION */}
      {/* ========================================================= */}
      {viewMode === "TABLE" && (
        <div className="space-y-4">
          {/* Barre de Filtre & Recherche */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un ticket par code ou commentaire..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">Tous les Profils ({users.length})</option>
                {profiles.map((p) => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name} ({getTicketsForProfile(p.name, p.session_timeout).length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handlePrintTickets(filteredUsers)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Imprimer les tickets actuellement filtrés"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer ({filteredUsers.length})</span>
              </button>
            </div>
          </div>

          {/* BARRE FLOTTANTE D'ACTION POUR LA SÉLECTION MULTIPLE */}
          {selectedIds.size > 0 && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                  {selectedIds.size}
                </span>
                <span>ticket(s) sélectionné(s) sur ce tableau</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Désélectionner tout
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintTickets(filteredUsers.filter((u) => selectedIds.has(u.id)))}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer ({selectedIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Suppression..." : `Supprimer les ${selectedIds.size} tickets`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TABLEAU DES TICKETS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Tout sélectionner sur ce tableau"
                      />
                    </th>
                    <th className="px-4 py-3.5">Code / Utilisateur</th>
                    <th className="px-4 py-3.5">Statut</th>
                    <th className="px-4 py-3.5">Profil</th>
                    <th className="px-4 py-3.5">Temps Utilisé</th>
                    <th className="px-4 py-3.5">Durée Prévue</th>
                    <th className="px-4 py-3.5">Consommation</th>
                    <th className="px-4 py-3.5">Commentaire (Lot)</th>
                    <th className="px-4 py-3.5 text-right">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                        Lecture des tickets RouterOS...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                        Aucun ticket trouvé pour ce profil ou cette recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const isChecked = u.id ? selectedIds.has(u.id) : false;

                      return (
                        <tr
                          key={u.id || idx}
                          onClick={() => setSelectedTicketDetails(u)}
                          className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group ${
                            isChecked ? "bg-blue-50/60 dark:bg-blue-950/40" : ""
                          }`}
                          title="Cliquer pour afficher tous les détails de ce ticket"
                        >
                          <td
                            className="px-4 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => u.id && handleToggleSelect(u.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {u.name}
                              </span>
                              {u.source === "saas" ? (
                                <span className="text-[9px] font-sans font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Cloud RADIUS
                                </span>
                              ) : (
                                <span className="text-[9px] font-sans font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                  RouterOS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                  : u.status === "EXPIRED"
                                  ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                  : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {u.status === "ACTIVE" ? "En cours" : u.status === "EXPIRED" ? "Expiré" : "Prêt"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {u.profile}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            {u.uptime || formatDuration(u.uptime_used_seconds) || "0s"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {u.time_limit || u.limit_uptime || "Illimité"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-[11px]">
                            ↑ {u.bytes_out_formatted || formatBytes(u.bytes_out)} / ↓ {u.bytes_in_formatted || formatBytes(u.bytes_in)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-sans text-[11px] truncate max-w-xs">
                            {u.comment || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketDetails(u);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Voir les détails"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GÉNÉRATEUR DE TICKETS PAR LOT */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                    Générer un Lot de Tickets
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Profil ciblé : <span className="font-bold text-blue-600 dark:text-blue-400">{genProfile}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="space-y-4">
              {/* 1. Mode d'authentification (1 champ vs 2 champs) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mode d'authentification au portail Wi-Fi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenAuthMode("single")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      genAuthMode === "single"
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${genAuthMode === "single" ? "bg-blue-600" : "bg-slate-400"}`} />
                      Code unique / PIN
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      1 seul champ au portail (Nom d'utilisateur = Mot de passe). Idéal mobile.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenAuthMode("dual")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      genAuthMode === "dual"
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${genAuthMode === "dual" ? "bg-blue-600" : "bg-slate-400"}`} />
                      Identifiant & Mot de passe
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      2 champs distincts au portail pour un niveau de sécurité renforcé.
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Nombre de tickets et Profil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nombre de tickets
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">Max 1 000</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                  />
                  <div className="flex items-center gap-1 mt-1.5">
                    {[10, 25, 50, 100, 500].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setGenCount(n)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                          genCount === n
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profil Hotspot
                  </label>
                  <select
                    value={genProfile}
                    onChange={(e) => {
                      const newP = e.target.value;
                      setGenProfile(newP);
                      const target = profiles.find((x) => x.name === newP);
                      if (target) {
                        if (target.session_timeout && target.session_timeout !== "Illimitée" && target.session_timeout !== "-") {
                          setGenTimeLimit(target.session_timeout);
                        }
                        if (target.price) {
                          const num = parseInt(target.price.toString().replace(/\D/g, ""));
                          if (!isNaN(num) && num > 0) setGenPrice(num);
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {profiles.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} ({p.price ? `${p.price} FCFA` : "100 FCFA"}) — {p.session_timeout || "1h"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Longueur du code & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Longueur du code
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([4, 6, 8] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setGenCodeLength(len)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          genCodeLength === len
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {len} chiffres
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Format des caractères
                  </label>
                  <select
                    value={genCodeFormat}
                    onChange={(e) => setGenCodeFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="numeric">Chiffres uniquement (0-9)</option>
                    <option value="alpha_upper">Majuscules & Chiffres (ABCD)</option>
                    <option value="alpha_lower">Minuscules & Chiffres (abcd)</option>
                  </select>
                </div>
              </div>

              {/* 4. Durée Uptime & Prix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Limite de durée (Uptime)
                  </label>
                  <input
                    type="text"
                    value={genTimeLimit}
                    onChange={(e) => setGenTimeLimit(e.target.value)}
                    placeholder="Ex: 2h, 4h, 24h, 7d, 30d"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Syntaxe : <span className="font-bold">h</span> = heures (ex: 4h, 24h), <span className="font-bold">d</span> = jours (ex: 7d, 30d).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prix unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={genPrice}
                    onChange={(e) => setGenPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 5. Préfixe & Commentaire */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Commentaire personnalisé (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={genComment}
                    onChange={(e) => setGenComment(e.target.value)}
                    placeholder="Ex: Vente Boutique Centre-Ville"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Format automatique si vide : <code className="text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">ticket : [Zone Wi-Fi] : [Date] : [Durée] : 00001</code>
                  </p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{actionLoading ? "Génération en cours..." : `Générer ${genCount} ticket(s)`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DÉTAIL DU TICKET */}
      {selectedTicketDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Détail du Ticket Hotspot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Métadonnées complètes et consommation en temps réel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Coupon Principal */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Code Coupon / Identifiant
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                  {selectedTicketDetails.name}
                </div>
                {selectedTicketDetails.password && selectedTicketDetails.password !== selectedTicketDetails.name && (
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    Mot de passe : <span className="font-bold text-slate-700 dark:text-slate-300">{selectedTicketDetails.password}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleCopyCode(selectedTicketDetails.name)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Copier le code coupon"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copié !" : "Copier"}</span>
              </button>
            </div>

            {/* Grille d'informations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-500" /> Forfait
                </span>
                <div className="font-black text-slate-900 dark:text-white truncate">
                  {selectedTicketDetails.profile || "Standard"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Statut
                </span>
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      selectedTicketDetails.status === "ACTIVE"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : selectedTicketDetails.status === "EXPIRED"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {selectedTicketDetails.status === "ACTIVE"
                      ? "En cours"
                      : selectedTicketDetails.status === "EXPIRED"
                      ? "Expiré"
                      : "Prêt"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Validité
                </span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedTicketDetails.time_limit || "Illimité"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Validité
                </span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedTicketDetails.time_limit || "Illimité"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Temps Consommé</span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedTicketDetails.uptime || formatDuration(selectedTicketDetails.uptime_used_seconds) || "0s"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Temps Restant</span>
                <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {selectedTicketDetails.status === "EXPIRED"
                    ? "Épuisé"
                    : selectedTicketDetails.remaining || (selectedTicketDetails.remaining_seconds ? formatDuration(selectedTicketDetails.remaining_seconds) : "Disponible")}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Prix de Vente</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedTicketDetails.price ? `${selectedTicketDetails.price} FCFA` : "—"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-sky-500" /> Données Consommées (In / Out)
                </span>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                  ↑ {selectedTicketDetails.bytes_out_formatted || formatBytes(selectedTicketDetails.bytes_out)} / ↓ {selectedTicketDetails.bytes_in_formatted || formatBytes(selectedTicketDetails.bytes_in)}
                  <span className="text-[11px] font-normal text-slate-400 ml-2">
                    (Total: {selectedTicketDetails.total_traffic_formatted || formatBytes((selectedTicketDetails.bytes_in || 0) + (selectedTicketDetails.bytes_out || 0))})
                  </span>
                </div>
              </div>
            </div>

            {/* Métadonnées & Appareil */}
            <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 font-mono">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 font-sans flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Appareil lié (MAC) :
                </span>
                <span className="font-bold">{selectedTicketDetails.mac_address || "Non verrouillé (Tout appareil)"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 font-sans flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Lot / Réf :
                </span>
                <span className="truncate max-w-[260px] text-right font-sans">{selectedTicketDetails.comment || "—"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const toDeleteId = selectedTicketDetails.id;
                  if (!toDeleteId) return;
                  if (confirm(`Supprimer définitivement le ticket '${selectedTicketDetails.name}' ?`)) {
                    setSelectedTicketDetails(null);
                    api.deleteSaaSTickets(routerId, [toDeleteId]).then(() => {
                      setActionSuccess("Ticket supprimé avec succès.");
                      loadData();
                    }).catch((err) => setActionError(err.message));
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTicketDetails;
                    setSelectedTicketDetails(null);
                    handlePrintTickets([t]);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicketDetails(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone d'impression universelle A4 découpable */}
      {printTickets.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs p-4 flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-transparent print:static print:overflow-visible">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto print:border-none print:shadow-none print:p-0 print:max-w-none print:m-0 print:rounded-none">
            {/* Header de la modale masqué à l'impression */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 no-print">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Impression des Tickets Hotspot ({printTickets.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prêt pour impression thermique ou format A4 découpable.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Génère un vrai PDF vectoriel A4 via Chromium Playwright"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isDownloadingPdf ? "Génération PDF..." : "Télécharger PDF (Chromium)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Imprimer directement via la boîte de dialogue du navigateur"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Navigateur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTickets([])}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grille A4 Découpable (4 colonnes, cadrage exact non rogné) */}
            <div id="print-area" className="vouchers-grid grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 text-slate-950">
              {printTickets.map((t, idx) => {
                const hotspotTitle = (routerData?.hotspot_name || routerData?.name || "TIKZONE HOTSPOT").toUpperCase();
                return (
                  <div
                    key={t.id || idx}
                    className="voucher-card border-[1.5px] border-slate-900 rounded-md p-2 bg-white text-slate-950 flex flex-col justify-between select-none"
                    style={{ minHeight: "110px" }}
                  >
                    <div>
                      <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-tight">
                        <span className="truncate pr-1">{hotspotTitle}</span>
                        <span className="shrink-0 text-[10px]">[{idx + 1}]</span>
                      </div>
                      <div className="border-b-[1.5px] border-slate-900 my-0.5"></div>
                    </div>

                    <div className="my-auto py-1 text-center space-y-0.5">
                      {t.password && t.password !== t.name ? (
                        <div className="space-y-1 bg-slate-50 border-[1.5px] border-slate-900 rounded p-1">
                          <div className="flex items-center justify-between text-[9px] font-bold">
                            <span className="text-slate-600 uppercase">Utilisateur :</span>
                            <span className="font-mono font-black text-slate-950 text-xs">{t.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-bold border-t border-slate-300 pt-0.5">
                            <span className="text-slate-600 uppercase">Mot de passe :</span>
                            <span className="font-mono font-black text-rose-600 text-xs">{t.password}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                            Code Ticket (PIN)
                          </div>
                          <div className="border-[1.5px] border-slate-900 rounded px-2 py-0.5 text-sm font-black font-mono tracking-widest bg-slate-50">
                            {t.name}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border-[1.5px] border-slate-900 rounded px-1 py-0.5 text-center text-[10px] font-black uppercase tracking-tight bg-slate-50 mt-0.5">
                      Pass {t.time_limit || t.profile || "3h"} — {t.price ? `${t.price} FCFA` : "Actif"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Style d'impression Découpable A4 & Thermique */}
      <style jsx global>{`
        @media print {
          /* Masquer tout élément applicatif non pertinent */
          .no-print,
          aside,
          nav,
          header {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-area {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #print-area * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .vouchers-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
            width: 100% !important;
            padding: 0 !important;
            border: none !important;
          }
          .voucher-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
