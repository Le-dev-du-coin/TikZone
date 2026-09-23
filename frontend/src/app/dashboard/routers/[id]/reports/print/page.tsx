"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Coins, Download, Loader2, Printer, X } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterSalesReportPrintPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [report, setReport] = useState<any>(null);
  const [routerData, setRouterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getRouterSalesReport(routerId).catch(() => null),
      api.getRouters().catch(() => []),
    ]).then(([rep, routers]) => {
      if (rep) setReport(rep);
      if (Array.isArray(routers)) {
        const found = routers.find((r: any) => r.id === routerId);
        if (found) setRouterData(found);
      }
      setLoading(false);
    });
  }, [routerId]);

  const todayStr = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const nowTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const todayRev = report?.today_revenue || 0;
  const monthRev = report?.month_revenue || 0;
  const todayCount = report?.today_count || 0;
  const activeSessions = report?.active_sessions || 0;
  const totalUsers = report?.total_users || 0;
  const sales: any[] = report?.sales_history || [];

  const routerName = routerData?.name || "Routeur MikroTik";
  const wifiZone = routerData?.hotspot_name || routerName;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 font-sans print:p-0 print:bg-white text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Barre d'action flottante en haut (masquée à l'impression) */}
      <div className="no-print max-w-4xl mx-auto mb-5 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            Aperçu Bilan Financier — {wifiZone}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setIsDownloadingPdf(true);
              try {
                await api.downloadSalesReportPdf(routerId, routerName);
              } catch (err: any) {
                alert("Erreur de génération PDF Playwright: " + (err.message || "Erreur serveur"));
              } finally {
                setIsDownloadingPdf(false);
              }
            }}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Génération d'un vrai PDF vectoriel haute fidélité via Chromium Playwright"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingPdf ? "Génération Chromium..." : "Imprimer / Télécharger en PDF (Chromium)"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fermer</span>
          </button>
        </div>
      </div>

      {/* Document A4 */}
      <div className="print-area max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {/* En-tête officiel */}
        <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-5">
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight flex items-center gap-2">
              <span>⚡ TikZone Hotspot</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1">
              Bilan Financier & Encaissements des Vouchers
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Zone Wi-Fi : <strong className="text-slate-900">{wifiZone}</strong> (Matériel : {routerName})
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>Date d'édition : <strong className="text-slate-900">{todayStr}</strong></div>
            <div>Heure : <strong className="text-slate-900">{nowTime}</strong></div>
            <div className="text-[11px] text-emerald-600 font-bold">Réseau Certifié MikroTik</div>
          </div>
        </div>

        {/* Grille Synthèse financière (4 KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Recettes Aujourd'hui</div>
            <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
              {todayRev.toLocaleString("fr-FR")} FCFA
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">{todayCount} ticket(s) actif(s)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Recettes du Mois</div>
            <div className="text-xl font-black text-blue-700 mt-1 font-mono">
              {monthRev.toLocaleString("fr-FR")} FCFA
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Ventes cumulées</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Sessions Actives</div>
            <div className="text-xl font-black text-amber-700 mt-1 font-mono">
              {activeSessions}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Connectés en direct</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">Parc Total Tickets</div>
            <div className="text-xl font-black text-slate-800 mt-1 font-mono">
              {totalUsers.toLocaleString("fr-FR")}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tickets générés</div>
          </div>
        </div>

        {/* Tableau détaillé des ventes */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center justify-between">
            <span>Journal Récent des Encaissements ({sales.length} entrées)</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Code Ticket</th>
                  <th className="py-2.5 px-3">Forfait</th>
                  <th className="py-2.5 px-3">Référence / Date</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Aucune vente enregistrée récemment sur ce routeur.
                    </td>
                  </tr>
                ) : (
                  sales.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">{s.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{s.profile || "default"}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{s.date || todayStr}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.consumed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {s.consumed ? "Consommé" : "Disponible"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-black font-mono text-emerald-700 text-xs">
                        {(s.price || 100).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pied de page officiel */}
        <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-0.5">
          <p>Document financier généré par le moteur TikZone Engine SaaS • Compatible MikroTik RouterOS</p>
          <p>© {new Date().getFullYear()} TikZone. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
