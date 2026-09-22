"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  FileText,
  Filter,
  Layers,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Zap,
  Trash2,
  X,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterReportsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [report, setReport] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_reports_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !report);
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"ALL" | "TODAY" | "YESTERDAY" | "MONTH">("ALL");

  // Modal de Réinitialisation / Purge
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPeriod, setResetPeriod] = useState<"today" | "yesterday" | "month" | "year" | "all">("today");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const res = await api.getRouterSalesReport(routerId);
      setReport(res);
      try {
        localStorage.setItem(`tikzone_cached_reports_${routerId}`, JSON.stringify(res));
      } catch {}
    } catch (err) {
      console.error("Erreur chargement rapport:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetReports = async () => {
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await api.resetRouterSalesReport(routerId, resetPeriod);
      setResetMsg({ type: "success", text: res.detail || "Rapports et tickets réinitialisés avec succès." });
      await loadData();
      setTimeout(() => {
        setShowResetModal(false);
        setResetMsg(null);
      }, 1500);
    } catch (err: any) {
      setResetMsg({ type: "error", text: err.message || "Erreur lors de la réinitialisation" });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routerId]);

  const handleOpenPrintReport = () => {
    window.open(`/dashboard/routers/${routerId}/reports/print`, "_blank");
  };

  const history: any[] = report?.sales_history || [];

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      (item.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.batch_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.profile || "").toLowerCase().includes(search.toLowerCase());

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    if (filterPeriod === "TODAY" && item.date !== todayStr) return false;
    if (filterPeriod === "YESTERDAY" && item.date !== yesterdayStr) return false;
    if (filterPeriod === "MONTH" && !item.date?.startsWith(monthStr)) return false;

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .card-print {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Rapports Financiers & Ventes de Tickets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Suivi en temps réel de votre chiffre d'affaires, statistiques des forfaits et journal de caisse Hotspot.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenPrintReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Ouvrir le rapport dans un nouvel onglet pour l'enregistrer en PDF ou l'imprimer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Rapport</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            title="Purger tous les tickets de test et remettre la caisse à 0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Réinitialiser / Vider</span>
          </button>
        </div>
      </div>

      {/* Cartes Synthèse Chiffre d'Affaires */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aujourd'hui */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Aujourd'hui</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
              {(report?.today_revenue || 0).toLocaleString("fr-FR")} FCFA
            </div>
            <p className="text-xs text-emerald-200 mt-1 font-semibold">
              {report?.today_count || 0} tickets vendus aujourd'hui
            </p>
          </div>
        </div>

        {/* Hier */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Hier</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
              {(report?.yesterday_revenue || 0).toLocaleString("fr-FR")} FCFA
            </div>
            <p className="text-xs text-blue-200 mt-1 font-semibold">
              {report?.yesterday_count || 0} tickets encaissés
            </p>
          </div>
        </div>

        {/* Mois en cours */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-600/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-100 uppercase tracking-wider">Ce Mois-ci</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
              {(report?.month_revenue || 0).toLocaleString("fr-FR")} FCFA
            </div>
            <p className="text-xs text-violet-200 mt-1 font-semibold">
              {report?.month_count || 0} tickets sur le mois
            </p>
          </div>
        </div>

        {/* Parc Actif */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20 flex flex-col justify-between border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Comptes</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
              {(report?.total_users || 0).toLocaleString("fr-FR")}
            </div>
            <p className="text-xs text-emerald-400 mt-1 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{report?.active_sessions || 0} sessions actives directes</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par code ticket, lot (ex: TZ-8492) ou profil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterPeriod("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterPeriod === "ALL"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("TODAY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterPeriod === "TODAY"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("YESTERDAY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterPeriod === "YESTERDAY"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
            }`}
          >
            Hier
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("MONTH")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterPeriod === "MONTH"
                ? "bg-violet-600 text-white"
                : "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
            }`}
          >
            Ce mois
          </button>
        </div>
      </div>

      {/* Journal des Ventes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-print">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Journal de Caisse Récent ({filteredHistory.length} opérations)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Date / Heure</th>
                <th className="px-5 py-3.5">Code Ticket</th>
                <th className="px-5 py-3.5">Lot / Origine</th>
                <th className="px-5 py-3.5">Profil Forfait</th>
                <th className="px-5 py-3.5">Prix / Montant (FCFA)</th>
                <th className="px-5 py-3.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Aucune vente enregistrée pour cette sélection.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.date}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                      <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-sans text-xs">
                      {item.batch_id}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-sans">
                      {item.profile}
                    </td>
                    <td className="px-5 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {item.price.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-5 py-3 text-right font-sans">
                      {item.consumed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Actif / Consommé</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Non activé</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmation Réinitialisation / Purge */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-black text-base">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span>Réinitialiser les Rapports & Tickets</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!resetLoading) {
                    setShowResetModal(false);
                    setResetMsg(null);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sélectionnez la période des données que vous souhaitez supprimer :
            </p>

            {/* Choix de la période de suppression */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResetPeriod("today")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  resetPeriod === "today"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-600"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => setResetPeriod("yesterday")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  resetPeriod === "yesterday"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-600"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                Hier
              </button>
              <button
                type="button"
                onClick={() => setResetPeriod("month")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  resetPeriod === "month"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-600"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                Mois en cours
              </button>
              <button
                type="button"
                onClick={() => setResetPeriod("year")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  resetPeriod === "year"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-600"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                Année en cours
              </button>
              <button
                type="button"
                onClick={() => setResetPeriod("all")}
                className={`col-span-2 p-2.5 rounded-xl border text-left transition-all ${
                  resetPeriod === "all"
                    ? "border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-100 font-black ring-2 ring-rose-600"
                    : "border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
                }`}
              >
                Tout le rapport complet (Remise à zéro totale)
              </button>
            </div>

            {resetMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                resetMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
              }`}>
                {resetMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{resetMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={resetLoading}
                onClick={() => {
                  setShowResetModal(false);
                  setResetMsg(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={resetLoading}
                onClick={handleResetReports}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{resetLoading ? "Réinitialisation en cours..." : "Confirmer la Réinitialisation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
