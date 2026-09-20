"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Clock, Gauge, RefreshCw, ShieldAlert, Zap } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterProfilesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getRouterProfiles(routerId);
      setProfiles(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routerId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Gauge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Profils de Débit & Limitations</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualisez les profils de bande passante et règles de session configurés sur votre routeur MikroTik.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Profiles Cards / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Nom du Profil</th>
                <th className="px-5 py-3.5">Bande Passante (Rate Limit)</th>
                <th className="px-5 py-3.5">Appareils Simultanés</th>
                <th className="px-5 py-3.5">Expiration de Session</th>
                <th className="px-5 py-3.5">Rafraîchissement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Lecture des profils RouterOS...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Aucun profil configuré pour l'instant.
                  </td>
                </tr>
              ) : (
                profiles.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white font-sans text-sm">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                        {p.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {p.rate_limit && p.rate_limit !== "Illimité" ? p.rate_limit : "Illimité (Par défaut)"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {p.shared_users} appareil(s)
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200/60 dark:border-amber-800/60 font-sans">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{p.session_timeout || "Illimitée"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {p.status_autorefresh || "1m"}
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
