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

  // Modale d'ajout individuel
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addProfile, setAddProfile] = useState("default");
  const [addTimeLimit, setAddTimeLimit] = useState("");

  // Notifications
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, profRes] = await Promise.all([
        api.getRouterHotspotUsers(routerId, 500).catch(() => ({ results: [] })),
        api.getRouterProfiles(routerId).catch(() => ({ results: [] })),
      ]);
      const parsedUsers = usersRes.results || [];
      const parsedProfiles = profRes.results || [];

      setUsers(parsedUsers);
      setProfiles(parsedProfiles);

      try {
        localStorage.setItem(`tikzone_cached_users_${routerId}`, JSON.stringify(parsedUsers));
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
    if (!confirm(`Supprimer définitivement ${count} ticket(s) sélectionné(s) sur le routeur ?`)) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);
    try {
      const userIdsArray = Array.from(selectedIds);
      await api.deleteRouterHotspotUsers(routerId, userIdsArray);
      setActionSuccess(`${count} ticket(s) supprimé(s) avec succès du MikroTik !`);
      setSelectedIds(new Set());
      await loadData();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError("Erreur lors de la suppression : " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Création individuelle d'un ticket
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await api.addRouterHotspotUser(routerId, {
        name: addName.trim(),
        password: addPassword.trim() || addName.trim(),
        profile: addProfile,
        time_limit: addTimeLimit.trim(),
        comment: "TikZone Ticket Direct",
      });
      setActionSuccess(`Ticket '${addName}' créé avec succès !`);
      setAddName("");
      setAddPassword("");
      setAddTimeLimit("");
      setTimeout(() => setShowAddModal(false), 1200);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur de création");
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
            onClick={() => {
              setActionSuccess(null);
              setActionError(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Créer un Ticket</span>
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
                <Link
                  href={`/dashboard/routers/${routerId}/tickets`}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center gap-1.5 text-center"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Générer</span>
                </Link>
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
                      onClick={() => {
                        setAddProfile(p.name);
                        setShowAddModal(true);
                      }}
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
                            <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
                              {u.name}
                            </span>
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

      {/* MODAL CRÉER UN TICKET */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-600" />
                <span>Créer un Ticket Hotspot</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Code Ticket / Identifiant
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ex: 849201"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe (Laisser vide pour code identique)
                </label>
                <input
                  type="text"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Identique au code si vide"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Profil de Débit / Validité
                </label>
                <select
                  value={addProfile}
                  onChange={(e) => setAddProfile(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="default">default</option>
                  {profiles.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} ({p.price || "100 FCFA"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Limite Uptime (Optionnel, ex: 1h, 24h, 3d)
                </label>
                <input
                  type="text"
                  value={addTimeLimit}
                  onChange={(e) => setAddTimeLimit(e.target.value)}
                  placeholder="Ex: 1h, 2h, 1d"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>{actionLoading ? "Création..." : "Créer le Ticket"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
