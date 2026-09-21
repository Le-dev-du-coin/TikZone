"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Layers,
  Plus,
  RefreshCw,
  Search,
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
  const [genProfile, setGenProfile] = useState("default");
  const [genTimeLimit, setGenTimeLimit] = useState("3h");
  const [genCodeLength, setGenCodeLength] = useState<4 | 6 | 8>(6);
  const [genCodeFormat, setGenCodeFormat] = useState<"numeric" | "alpha_upper" | "alpha_lower">("numeric");
  const [genPrefix, setGenPrefix] = useState("");
  const [genPrice, setGenPrice] = useState(100);
  const [genComment, setGenComment] = useState("");

  // Notifications
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, saasRes, profRes] = await Promise.all([
        api.getRouterHotspotUsers(routerId, 500).catch(() => ({ results: [] })),
        api.getSaaSTickets(routerId).catch(() => ({ results: [] })),
        api.getRouterProfiles(routerId).catch(() => ({ results: [] })),
      ]);

      const parsedRouterUsers = (usersRes.results || []).map((u: any) => ({
        ...u,
        source: "routeros",
      }));

      const parsedSaaSTickets = (saasRes.results || []).map((t: any) => ({
        id: t.id,
        name: t.code,
        password: t.password,
        profile: t.profile,
        comment: t.comment || "Ticket Cloud RADIUS",
        uptime: t.uptime_used_seconds ? `${Math.floor(t.uptime_used_seconds / 60)}m` : "0s",
        bytes_in: t.bytes_in,
        bytes_out: t.bytes_out,
        source: "saas",
        status: t.status,
        price: t.price,
        time_limit: t.time_limit,
      }));

      const combinedUsers = [...parsedSaaSTickets, ...parsedRouterUsers];
      const parsedProfiles = profRes.results || [];

      setUsers(combinedUsers);
      setProfiles(parsedProfiles);

      try {
        localStorage.setItem(`tikzone_cached_users_${routerId}`, JSON.stringify(combinedUsers));
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

  // Décompte des tickets par profil
  const profileCounts: Record<string, number> = {};
  users.forEach((u) => {
    const prof = u.profile || "default";
    profileCounts[prof] = (profileCounts[prof] || 0) + 1;
  });

  // Filtrage des tickets pour la vue tableau
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.comment && u.comment.toLowerCase().includes(search.toLowerCase()));
    const matchesProfile = selectedProfile === "ALL" || u.profile === selectedProfile;
    return matchesSearch && matchesProfile;
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
        : profiles[0]?.name || "default";

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
      const res = await api.generateRouterTickets(routerId, {
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
      setActionSuccess(`${res.count || genCount} tickets générés avec succès !`);
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
                  ? "Tickets & Vouchers Hotspot"
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
            <button
              type="button"
              onClick={() => setViewMode("CARDS")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Vue par Profils</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            title="Actualiser les tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            href={`/dashboard/routers/${routerId}/tickets`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Générateur Avancé</span>
          </Link>

          <button
            type="button"
            onClick={() => handleOpenGenerateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Générer des Tickets</span>
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

              <div className="flex items-center gap-2 pt-4 mt-3 border-t border-white/20 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfile("ALL");
                    setViewMode("TABLE");
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenGenerateModal("ALL")}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Générer</span>
                </button>
              </div>
            </div>

            {/* Cartes par Profil individuel */}
            {profiles.map((p, idx) => {
              const palette = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length];
              const count = profileCounts[p.name] || 0;

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

                  <div className="flex items-center gap-2 pt-4 mt-3 border-t border-white/20 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfile(p.name);
                        setViewMode("TABLE");
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenGenerateModal(p.name)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Générer</span>
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
                    {p.name} ({profileCounts[p.name] || 0})
                  </option>
                ))}
              </select>
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
                    <th className="px-4 py-3.5">Profil</th>
                    <th className="px-4 py-3.5">Temps Utilisé</th>
                    <th className="px-4 py-3.5">Durée Prévue</th>
                    <th className="px-4 py-3.5">Consommation (Haut / Bas)</th>
                    <th className="px-4 py-3.5">Commentaire (Lot)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                        Lecture des tickets RouterOS...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                        Aucun ticket trouvé pour ce profil ou cette recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const isChecked = u.id ? selectedIds.has(u.id) : false;

                      return (
                        <tr
                          key={u.id || idx}
                          onClick={() => u.id && handleToggleSelect(u.id)}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            isChecked ? "bg-blue-50/50 dark:bg-blue-950/30" : ""
                          }`}
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
                              <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
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
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {u.profile}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            {u.uptime || "0s"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {u.limit_uptime || "Illimité"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-[11px]">
                            ↑ {u.bytes_out} / ↓ {u.bytes_in}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-sans text-[11px] truncate max-w-xs">
                            {u.comment || "—"}
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
                    <option value="default">default</option>
                    {profiles
                      .filter((p) => p.name?.toLowerCase() !== "default")
                      .map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          {p.name} ({p.price || "100 FCFA"})
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
    </div>
  );
}
