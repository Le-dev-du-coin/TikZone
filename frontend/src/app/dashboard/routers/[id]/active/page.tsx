"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Wifi,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterActiveSessionsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const overview = await api.getRouterHotspotOverview(routerId);
      setActiveUsers(overview.active_users || []);
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
    if (!confirm(`Déconnecter immédiatement la session de '${username}' ?`)) return;
    setDisconnectingId(activeId);
    try {
      await api.disconnectActiveUser(routerId, activeId);
      setMessage(`Session de '${username}' déconnectée.`);
      setTimeout(() => setMessage(null), 3000);
      loadData();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setDisconnectingId(null);
    }
  };

  const filtered = activeUsers.filter(
    (u) =>
      u.user.toLowerCase().includes(search.toLowerCase()) ||
      u.address.includes(search) ||
      u.mac_address.toLowerCase().includes(search.toLowerCase())
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
            Supervisez en temps réel les utilisateurs actuellement connectés et connectés à Internet.
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
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer par IP (ex: 10.18.10.x), adresse MAC ou code ticket..."
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
                <th className="px-4 py-3">Utilisateur / Code</th>
                <th className="px-4 py-3">Adresse IP</th>
                <th className="px-4 py-3">Adresse MAC</th>
                <th className="px-4 py-3">Durée Connexion</th>
                <th className="px-4 py-3">Consommation</th>
                <th className="px-4 py-3">Type Login</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading && activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Chargement des sessions en direct...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Aucun utilisateur actuellement connecté.
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr key={u.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        {u.user}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {u.address}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {u.mac_address}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      {u.uptime}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      ↑ {u.bytes_out} / ↓ {u.bytes_in}
                    </td>
                    <td className="px-4 py-3 font-sans text-[11px] text-slate-500 dark:text-slate-400">
                      {u.login_by || "http-chap"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDisconnect(u.id, u.user)}
                        disabled={disconnectingId === u.id}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Forcer la déconnexion"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
