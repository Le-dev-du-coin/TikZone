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

  useEffect(() => {
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
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
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
          }
          header,
          aside,
          button,
          .no-print {
            display: none !important;
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
            Générez des séries de coupons Hotspot et imprimez-les en format planche A4 ou rouleau thermique POS.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printFormat === "grid"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Format Grille A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            /* Grille A4 Découpable (4 colonnes) */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-slate-900">
              {tickets.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-between text-center bg-slate-50/50 space-y-2 break-inside-avoid"
                >
                  <div className="border-b border-slate-200 pb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                      TikZone Hotspot
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      Pass {t.time_limit}
                    </p>
                  </div>

                  <div className="py-1">
                    <p className="text-[10px] text-slate-400 font-semibold">Code Unique :</p>
                    <p className="text-base font-black font-mono tracking-widest text-slate-900 bg-white border border-slate-200 rounded-lg py-1 px-2">
                      {t.code}
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>{t.price} FCFA</span>
                    <span>1 Appareil</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Format Rouleau Thermique POS 58mm / 80mm */
            <div className="max-w-xs mx-auto space-y-4 bg-white p-4 rounded-xl border border-slate-200 text-slate-900 font-mono">
              {tickets.map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-slate-400 rounded-lg text-center space-y-2 break-inside-avoid"
                >
                  <p className="text-xs font-black uppercase">*** TIKZONE HOTSPOT ***</p>
                  <p className="text-[11px]">Pass Internet : {t.time_limit}</p>
                  <p className="text-[11px]">Prix : {t.price} FCFA</p>
                  <div className="border-t border-b border-dashed border-slate-400 py-2 my-1">
                    <p className="text-[10px]">CODE D'ACCÈS :</p>
                    <p className="text-lg font-black tracking-widest">{t.code}</p>
                  </div>
                  <p className="text-[9px] text-slate-500">Connectez-vous au WiFi et saisissez votre code.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
