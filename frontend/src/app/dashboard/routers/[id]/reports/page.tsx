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

  useEffect(() => {
    loadData();
  }, [routerId]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await api.downloadSalesReportPdf(routerId, "bilan");
    } catch (err: any) {
      alert("Erreur lors de l'export PDF : " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Générer un PDF vectoriel haute définition via Chromium (Playwright)"
          >
            <Download className={`w-4 h-4 ${downloadingPdf ? "animate-bounce" : ""}`} />
            <span>{downloadingPdf ? "Génération..." : "PDF Chromium"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Actualiser</span>
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
                <th className="px-5 py-3.5">Montant Encaissé</th>
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
    </div>
  );
}
