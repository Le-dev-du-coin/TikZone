"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
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

  // Modal d'édition des limites du ticket
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editTimeLimit, setEditTimeLimit] = useState("");
  const [editByteLimit, setEditByteLimit] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  const loadData = async () => {
    try {
      const overview = await api.getRouterHotspotOverview(routerId);
      if (overview?.active_users) {
        setActiveUsers(overview.active_users);
        try {
          localStorage.setItem(`tikzone_cached_hotspot_${routerId}`, JSON.stringify(overview));
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

  const handleDisconnect = async (activeId: string, username: string) => {
    if (!confirm(`Déconnecter immédiatement la session active de '${username}' ? (Le ticket ne sera pas supprimé, le client pourra se reconnecter)`)) return;
    setDisconnectingId(activeId);
    try {
      await api.disconnectActiveUser(routerId, activeId);
      setMessage(`Session de '${username}' déconnectée (Kick réussi).`);
      setTimeout(() => setMessage(null), 3500);
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
                <th className="px-4 py-3.5">IP & MAC</th>
                <th className="px-4 py-3.5">Chronomètre (Écoulé / Restant)</th>
                <th className="px-4 py-3.5">Consommation Totale</th>
                <th className="px-4 py-3.5">Type Login</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading && activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Chargement des sessions en direct...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Aucun utilisateur actuellement connecté.
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr key={u.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
                        {u.user}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-900 dark:text-white font-bold">{u.address}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.mac_address}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Temps écoulé">
                          {u.uptime}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 text-[11px]" title="Temps restant">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{u.session_time_left || "Illimité"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {u.total_traffic || "0 B"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ↑ {u.bytes_out} / ↓ {u.bytes_in}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.login_by || "http-chap"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Modifier les limites (Temps / Quota)"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDisconnect(u.id, u.user)}
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
    </div>
  );
}
