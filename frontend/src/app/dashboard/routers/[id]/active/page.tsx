"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  HardDrive,
  Loader2,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Upload,
  Wifi,
  X,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterActiveSessionsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [activeUsers, setActiveUsers] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_hotspot_${routerId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.active_users) return parsed.active_users;
        }
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => activeUsers.length === 0);
  const [search, setSearch] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de confirmation de déconnexion (Kick)
  const [sessionToKick, setSessionToKick] = useState<{ activeId: string; username: string } | null>(null);

  // Modal de détail de la session active
  const [selectedActiveDetails, setSelectedActiveDetails] = useState<any | null>(null);

  // Modal d'édition des limites du ticket
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editTimeLimit, setEditTimeLimit] = useState("");
  const [editByteLimit, setEditByteLimit] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  const loadData = async () => {
    try {
      const overview = await api.getRouterHotspotOverview(routerId);
      if (overview?.active_users) {
        // Exclusion stricte et absolue de toute session expirée
        const validActive = (overview.active_users || []).filter((s: any) => {
          const left = String(s.session_time_left || "").toLowerCase().trim();
          return !["0s", "0m", "0h", "00:00:00", "expiré", "expire"].includes(left);
        });
        setActiveUsers(validActive);
        try {
          localStorage.setItem(
            `tikzone_cached_hotspot_${routerId}`,
            JSON.stringify({ ...overview, active_users: validActive })
          );
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [routerId]);

  const handleDisconnect = (activeId: string, username: string) => {
    setSessionToKick({ activeId, username });
  };

  const handleConfirmKick = async () => {
    if (!sessionToKick) return;
    const { activeId, username } = sessionToKick;
    setDisconnectingId(activeId);
    setSessionToKick(null);
    try {
      await api.disconnectActiveUser(routerId, activeId);
      setMessage(`Session de '${username}' déconnectée avec succès (Kick réussi).`);
      setTimeout(() => setMessage(null), 3500);
      setActiveUsers((prev) => prev.filter((u) => u.id !== activeId && u.ros_active_id !== activeId));
      loadData();
    } catch (err: any) {
      setErrorMsg("Erreur lors de la déconnexion : " + err.message);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleOpenEdit = (session: any) => {
    setEditingSession(session);
    setEditTimeLimit("");
    setEditByteLimit("");
    setMessage(null);
    setErrorMsg(null);
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSavingLimits(true);
    setErrorMsg(null);
    try {
      await api.updateRouterUserLimits(routerId, editingSession.user, {
        time_limit: editTimeLimit || undefined,
        byte_limit: editByteLimit || undefined,
      });
      setMessage(`Limites du ticket '${editingSession.user}' mises à jour.`);
      setTimeout(() => setMessage(null), 3500);
      setEditingSession(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la mise à jour des limites");
    } finally {
      setSavingLimits(false);
    }
  };

  const filtered = activeUsers.filter(
    (u) =>
      (u.user || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.address || "").includes(search) ||
      (u.mac_address || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Sessions Hotspot Actives en Direct</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supervisez les clients actuellement connectés, leur temps restant et leur consommation de données en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeUsers.length} session(s) active(s)</span>
          </span>

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer par code ticket, IP (ex: 10.20.10.x) ou adresse MAC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Active Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Ticket / Client</th>
                <th className="px-4 py-3.5">Forfait / Profil</th>
                <th className="px-4 py-3.5">Prix (FCFA)</th>
                <th className="px-4 py-3.5">Durée Prévue</th>
                <th className="px-4 py-3.5">Temps Écoulé</th>
                <th className="px-4 py-3.5">Temps Restant</th>
                <th className="px-4 py-3.5">IP & MAC</th>
                <th className="px-4 py-3.5">Consommation</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading && activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Chargement des sessions en direct...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Aucun utilisateur actuellement connecté.
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr
                    key={u.id || idx}
                    onClick={() => setSelectedActiveDetails(u)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    title="Cliquer pour afficher tous les détails de cette session active"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-xs group-hover:text-blue-600 transition-colors">
                        {u.user}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {u.profile || "default"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black font-mono text-xs border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        {u.price || "100 FCFA"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {u.limit_uptime && u.limit_uptime !== "-" ? u.limit_uptime : "Illimité"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Temps écoulé">
                        {u.uptime}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold text-xs" title="Temps restant">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{u.session_time_left || "Illimité"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-900 dark:text-white font-bold">{u.address}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.mac_address}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {u.total_traffic || "0 B"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ↑ {u.bytes_out} / ↓ {u.bytes_in}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActiveDetails(u);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Voir les détails complets de la session"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(u);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Modifier les limites (Temps / Quota)"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(u.id, u.user);
                          }}
                          disabled={disconnectingId === u.id}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Déconnecter l'appareil immédiatement (Kick)"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ÉDITER LES LIMITES */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Ajuster les Limites du Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs space-y-1">
              <div className="font-bold text-blue-900 dark:text-blue-200">
                Ticket : <span className="font-mono">{editingSession.user}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                IP: {editingSession.address} · MAC: {editingSession.mac_address}
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                Consommation actuelle : {editingSession.total_traffic} (Uptime : {editingSession.uptime})
              </div>
            </div>

            <form onSubmit={handleSaveLimits} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nouvelle Limite de Temps (Uptime)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2h, 4h, 1d (laisser vide si inchangé)"
                  value={editTimeLimit}
                  onChange={(e) => setEditTimeLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format MikroTik : 30m, 1h, 2h30m, 1d</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quota de Données Total (Mo / Go)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 500M, 1G, 2G (laisser vide si illimité)"
                  value={editByteLimit}
                  onChange={(e) => setEditByteLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Exemples : 500M pour 500 Mo, 2G pour 2 Go</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingLimits}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {savingLimits ? "Enregistrement..." : "Appliquer les Limites"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL SESSION ACTIVE */}
      {selectedActiveDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Session Active Hotspot
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>En ligne en direct</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActiveDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identifiant Coupon / Client */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Ticket Connecté
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                  {selectedActiveDetails.user}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Forfait : <span className="font-bold text-blue-600 dark:text-blue-400">{selectedActiveDetails.profile || "Standard"}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400">Tarif Forfait</span>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedActiveDetails.price || "100 FCFA"}
                </div>
              </div>
            </div>

            {/* Grille Métriques Session */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-blue-500" /> Adresse IP
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
                  {selectedActiveDetails.address || "—"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" /> Uptime Écoulé
                </span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedActiveDetails.uptime || "0s"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> Temps Restant
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedActiveDetails.session_time_left || "Illimité"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Upload className="w-3 h-3 text-indigo-500" /> Téléversement
                </span>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  ↑ {selectedActiveDetails.bytes_out || "0 B"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Download className="w-3 h-3 text-sky-500" /> Téléchargement
                </span>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  ↓ {selectedActiveDetails.bytes_in || "0 B"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-teal-500" /> Total Trafic
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                  {selectedActiveDetails.total_traffic || "0 B"}
                </div>
              </div>
            </div>

            {/* Adresse MAC & Appareil */}
            <div className="text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 font-mono flex items-center justify-between">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Adresse MAC client :
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedActiveDetails.mac_address || "—"}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const s = selectedActiveDetails;
                  setSelectedActiveDetails(null);
                  handleDisconnect(s.id, s.user);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Déconnecter immédiatement"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnecter (Kick)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedActiveDetails;
                    setSelectedActiveDetails(null);
                    handleOpenEdit(s);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Ajuster Limites</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedActiveDetails(null)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION DE DÉCONNEXION (KICK) */}
      {sessionToKick && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Déconnecter la Session ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Déconnexion immédiate de l'utilisateur actif.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="text-slate-600 dark:text-slate-300">
                Êtes-vous sûr de vouloir couper la session en cours pour :
              </div>
              <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                {sessionToKick.username}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Le ticket ne sera pas supprimé et restera valide s'il lui reste du temps.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSessionToKick(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmKick}
                disabled={disconnectingId === sessionToKick.activeId}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {disconnectingId === sessionToKick.activeId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Déconnecter la Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
