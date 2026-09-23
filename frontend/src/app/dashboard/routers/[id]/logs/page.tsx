"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Info,
  Radio,
  RefreshCw,
  ScrollText,
  Search,
  Wifi,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterLogsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [logs, setLogs] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_logs_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => logs.length === 0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SUCCESS" | "WARNING" | "ERROR">("ALL");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "HOTSPOT" | "SYSTEM" | "RADIUS">("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getRouterLogs(routerId, 100);
      const parsed = res.results || res;
      setLogs(parsed);
      try {
        localStorage.setItem(`tikzone_cached_logs_${routerId}`, JSON.stringify(parsed));
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [routerId, autoRefresh]);

  const filteredLogs = logs.filter((log) => {
    const msg = (log.message || "").toLowerCase();
    const user = (log.user || "").toLowerCase();
    const ip = (log.ip || "").toLowerCase();
    const query = search.toLowerCase();

    const matchesSearch =
      msg.includes(query) ||
      user.includes(query) ||
      ip.includes(query) ||
      (log.time || "").includes(query);

    const isSuccess = log.status_type === "success" || msg.includes("log in") || msg.includes("logged in") || msg.includes("accept") || msg.includes("réussie");
    const isWarning = log.status_type === "warning" || msg.includes("logged out") || msg.includes("timeout") || msg.includes("fermée");
    const isError = log.status_type === "error" || msg.includes("failed") || msg.includes("invalid") || msg.includes("error") || msg.includes("refusé");

    if (filterType === "SUCCESS" && !isSuccess) return false;
    if (filterType === "WARNING" && !isWarning) return false;
    if (filterType === "ERROR" && !isError) return false;

    const cat = log.category || (log.topics?.includes("radius") ? "radius" : log.topics?.includes("hotspot") ? "hotspot" : "system");
    if (filterCategory === "HOTSPOT" && cat !== "hotspot") return false;
    if (filterCategory === "SYSTEM" && cat !== "system") return false;
    if (filterCategory === "RADIUS" && cat !== "radius") return false;

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Journaux d'Activité Hotspot & Système (Logs)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Événements directs extraits du buffer mémoire MikroTik RouterOS 7 (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">/log</code> avec topics <code className="text-blue-600 font-mono text-[10px]">hotspot</code> & <code className="text-slate-500 font-mono text-[10px]">system</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
            <span>Rafraîchissement 5s</span>
          </button>

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

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par code ticket, IP (ex: 10.20.10.x) ou message (ex: login, failed)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Filtre par Source / Catégorie */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tous les logs
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("HOTSPOT")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterCategory === "HOTSPOT"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              }`}
            >
              <Wifi className="w-3 h-3" />
              <span>Hotspot Seul</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("RADIUS")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterCategory === "RADIUS"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>RADIUS Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("SYSTEM")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === "SYSTEM"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Système
            </button>
          </div>
        </div>

        {/* Filtres par Statut d'événement */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Statut :</span>
          </span>
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "ALL"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            Tous ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("SUCCESS")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "SUCCESS"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            Connexions
          </button>
          <button
            type="button"
            onClick={() => setFilterType("WARNING")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "WARNING"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            Déconnexions
          </button>
          <button
            type="button"
            onClick={() => setFilterType("ERROR")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "ERROR"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            }`}
          >
            Échecs / Erreurs
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Heure</th>
                <th className="px-4 py-3">Source (Topic)</th>
                <th className="px-4 py-3">Utilisateur / Ticket</th>
                <th className="px-4 py-3">Adresse IP</th>
                <th className="px-4 py-3">Événement & Message RouterOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Aucun événement ne correspond à vos critères de filtrage.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const msgLower = (log.message || "").toLowerCase();
                  const isSuccess = msgLower.includes("log in") || msgLower.includes("logged in");
                  const isWarning = msgLower.includes("logged out") || msgLower.includes("timeout");
                  const isError = msgLower.includes("failed") || msgLower.includes("invalid") || msgLower.includes("error");

                  const displayUser = log.user && log.user !== "-" ? log.user : (log.message.split(" ")[0] || "-");
                  const displayIp = log.ip && log.ip !== "-" ? log.ip : "-";
                  const isHotspotTopic = log.category === "hotspot" || log.topics?.includes("hotspot");

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.time}
                      </td>
                      <td className="px-4 py-2.5 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            log.category === "radius" || log.topics?.includes("radius")
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : isHotspotTopic
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                          title={log.topics}
                        >
                          {log.category === "radius" || log.topics?.includes("radius") ? "RADIUS" : isHotspotTopic ? "Hotspot" : "Système"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs">
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
    </div>
  );
}
