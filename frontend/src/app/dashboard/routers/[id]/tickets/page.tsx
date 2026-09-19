"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Layers,
  Printer,
  Sparkles,
  Ticket,
  Wifi,
  Zap,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterTicketsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [count, setCount] = useState(20);
  const [profile, setProfile] = useState("default");
  const [timeLimit, setTimeLimit] = useState("1h");
  const [prefix, setPrefix] = useState("");
  const [codeLength, setCodeLength] = useState(6);
  const [price, setPrice] = useState(100);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [printFormat, setPrintFormat] = useState<"thermal" | "grid">("grid");

  const [routerData, setRouterData] = useState<any>(null);

  useEffect(() => {
    api
      .getRouters()
      .then((list) => {
        const found = list.find((r) => r.id === routerId);
        if (found) setRouterData(found);
      })
      .catch(() => {});

    api
      .getRouterProfiles(routerId)
      .then((res) => setProfiles(res.results || []))
      .catch(() => {});
  }, [routerId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.generateRouterTickets(routerId, {
        count,
        profile,
        time_limit: timeLimit,
        prefix,
        code_length: codeLength,
        price,
      });
      setTickets(res.tickets || []);
      setSuccessMsg(`${res.count || count} tickets générés avec succès !`);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de génération des tickets");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Styles Exact Mikhmon Standard (A4 4-Columns 27mm) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          header,
          aside,
          button,
          .no-print {
            display: none !important;
          }
          .vouchers-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 2.5mm !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .voucher-card {
            border: 1.5px solid #111111 !important;
            border-radius: 3px !important;
            padding: 1.8mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: 27mm !important;
            box-sizing: border-box !important;
          }
          .pos-container {
            width: 72mm !important;
            margin: 0 auto !important;
          }
          .pos-card {
            border-bottom: 1.5px dashed #000000 !important;
            padding: 3mm 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Générateur & Impression de Tickets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Générez des séries de coupons Hotspot et imprimez-les en format planche A4 (4 colonnes, 36 à 40 tickets/page) ou rouleau thermique POS.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printFormat === "grid"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Format Planche A4 (4 col)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printFormat === "thermal"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Rouleau Thermique POS
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer ({tickets.length} tickets)</span>
            </button>
          </div>
        )}
      </div>

      {/* Generator Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 no-print">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Paramètres du Lot de Tickets</span>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre de Tickets
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Prix du Ticket (FCFA)
            </label>
            <input
              type="number"
              min={0}
              step={25}
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 100)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Profil de Débit
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="default">default</option>
              {profiles.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name} ({p.rate_limit || "Illimité"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Durée de Connexion (Uptime)
            </label>
            <input
              type="text"
              placeholder="Ex: 1h, 2h, 1d"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Préfixe Optionnel
            </label>
            <input
              type="text"
              placeholder="Ex: VIP-"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? "Génération..." : `Générer ${count} Tickets`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tickets Printable Preview Area */}
      {tickets.length > 0 && (
        <div id="print-area" className="space-y-4">
          <div className="no-print flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500">
              Aperçu avant impression : {tickets.length} tickets prêts
            </span>
          </div>

          {printFormat === "grid" ? (
            /* Grille A4 Découpable (4 colonnes, Standard Mikhmon 27mm) */
            <div className="vouchers-grid grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 text-slate-950">
              {tickets.map((t, idx) => {
                const hotspotTitle = (routerData?.hotspot_name || routerData?.name || "TIKZONE HOTSPOT").toUpperCase();
                return (
                  <div
                    key={idx}
                    className="voucher-card border-[1.5px] border-slate-900 rounded-md p-2 bg-white text-slate-950 flex flex-col justify-between select-none"
                    style={{ minHeight: "105px" }}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-tight">
                        <span className="truncate pr-1">{hotspotTitle}</span>
                        <span className="shrink-0 text-[10px]">[{idx + 1}]</span>
                      </div>
                      <div className="border-b-[1.5px] border-slate-900 my-1"></div>
                    </div>

                    {/* Body : Code Ticket en grand */}
                    <div className="my-auto py-1 text-center space-y-0.5">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
                        Code Ticket
                      </div>
                      <div className="border border-slate-900 rounded px-2 py-0.5 text-sm font-black font-mono tracking-widest bg-slate-50">
                        {t.code}
                      </div>
                    </div>

                    {/* Footer : Durée & Prix */}
                    <div className="border border-slate-900 rounded px-1 py-0.5 text-center text-[10px] font-black uppercase tracking-tight bg-slate-50 mt-1 truncate">
                      Pass {t.time_limit} - {t.price} FCFA
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Format Rouleau Thermique POS 58mm / 80mm */
            <div className="pos-container max-w-xs mx-auto space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-slate-900 font-mono">
              {tickets.map((t, idx) => {
                const hotspotTitle = (routerData?.hotspot_name || routerData?.name || "TIKZONE HOTSPOT").toUpperCase();
                return (
                  <div
                    key={idx}
                    className="pos-card p-3 border border-slate-400 rounded-lg text-center space-y-1.5"
                  >
                    <p className="text-xs font-black uppercase">*** {hotspotTitle} ***</p>
                    <p className="text-[11px]">Pass Internet : {t.time_limit}</p>
                    <p className="text-[11px]">Prix : {t.price} FCFA</p>
                    <div className="border-t border-b border-dashed border-slate-400 py-1.5 my-1">
                      <p className="text-[9px] uppercase text-slate-500 font-sans">CODE D'ACCÈS :</p>
                      <p className="text-base font-black tracking-widest">{t.code}</p>
                    </div>
                    <p className="text-[8.5px] text-slate-500">Connectez-vous au WiFi et saisissez votre code.</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
