"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  FileDown,
  Printer,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterTicketsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  // Mode Cloud RADIUS Natif (exclusif)
  const [authMode, setAuthMode] = useState<"single" | "dual">("single");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [count, setCount] = useState(20);
  const [profile, setProfile] = useState("");
  const [timeLimit, setTimeLimit] = useState("1h");
  const [prefix, setPrefix] = useState("");
  const [codeLength, setCodeLength] = useState<4 | 6 | 8>(6);
  const [codeFormat, setCodeFormat] = useState<"alpha_upper" | "alpha_lower" | "numeric">("numeric");
  const [customComment, setCustomComment] = useState("");
  const [price, setPrice] = useState(100);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  // Modal Script RADIUS 1-Clic MikroTik
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [radiusScriptLoading, setRadiusScriptLoading] = useState(false);
  const [radiusScriptData, setRadiusScriptData] = useState<any>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const [routerData, setRouterData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tikzone_cached_routers");
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((r: any) => r.id === routerId);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    api
      .getRouters()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          try {
            localStorage.setItem("tikzone_cached_routers", JSON.stringify(list));
          } catch {}
        }
        const found = list.find((r) => r.id === routerId);
        if (found) setRouterData(found);
      })
      .catch(() => {});

    api
      .getRouterProfiles(routerId, { active_only: true })
      .then((res) => {
        const list = (res.results || []).filter((p: any) => p.is_active !== false);
        setProfiles(list);
        if (list.length > 0) {
          setProfile(list[0].name);
          if (list[0].price !== undefined) setPrice(Number(list[0].price));
          if (list[0].session_timeout) setTimeLimit(list[0].session_timeout);
        }
      })
      .catch(() => {});
  }, [routerId]);

  const handleProfileChange = (profileName: string) => {
    setProfile(profileName);
    const found = profiles.find((p) => p.name === profileName);
    if (found) {
      if (found.price !== undefined) setPrice(Number(found.price));
      if (found.session_timeout) setTimeLimit(found.session_timeout);
    }
  };

  const handleOpenRadiusModal = async () => {
    setShowRadiusModal(true);
    if (!radiusScriptData) {
      setRadiusScriptLoading(true);
      try {
        const data = await api.getRadiusSetupScript(routerId);
        setRadiusScriptData(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Erreur de chargement du script RADIUS");
      } finally {
        setRadiusScriptLoading(false);
      }
    }
  };

  const handleCopyRadiusScript = () => {
    if (radiusScriptData?.script) {
      navigator.clipboard.writeText(radiusScriptData.script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        count: Math.min(Math.max(count, 1), 1000),
        auth_mode: authMode,
        profile,
        time_limit: timeLimit,
        prefix,
        code_length: codeLength,
        code_format: codeFormat,
        price,
        comment: customComment,
      };

      const res = await api.generateSaaSTickets(routerId, payload);

      setTickets(res.tickets || []);
      setSuccessMsg(
        `${res.count || count} tickets Cloud RADIUS générés avec succès (${price} FCFA / ticket) !`
      );
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
      {/* Print Styles Exact A4 Découpable (4 colonnes, non rogné) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
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
            gap: 2mm !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .voucher-card {
            border: 1.5px solid #0f172a !important;
            border-radius: 4px !important;
            padding: 1.5mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            min-height: 29.5mm !important;
            height: auto !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/routers/${routerId}`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Ticket className="w-6 h-6 text-rose-600" />
              <span>Générateur de Tickets & Impression</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Créez des lots de tickets personnalisés (code numérique ou alphanumérique, longueur au choix) et imprimez-les en 1 clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tickets.length > 0 && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer ({tickets.length} tickets)</span>
            </button>
          )}
        </div>
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
          {/* Mode d'authentification (1 champ vs 2 champs) */}
          <div className="sm:col-span-2 lg:col-span-3 space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mode d'authentification au portail Wi-Fi
              </label>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Moteur Cloud RADIUS Haute Performance (Base Cloud)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("single")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  authMode === "single"
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${authMode === "single" ? "bg-blue-600" : "bg-slate-400"}`} />
                  Code unique / PIN (Recommandé)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  1 seul champ au portail (Nom d'utilisateur = Mot de passe). Idéal smartphones.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("dual")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  authMode === "dual"
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${authMode === "dual" ? "bg-blue-600" : "bg-slate-400"}`} />
                  Identifiant & Mot de passe distincts
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  2 champs au portail pour une sécurité renforcée.
                </div>
              </button>
            </div>
          </div>

          {/* Profil / Forfait Hotspot */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Forfait Hotspot
              </label>
              <Link
                href={`/dashboard/routers/${routerId}/profiles`}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Gérer les forfaits
              </Link>
            </div>
            <select
              value={profile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              {profiles.length === 0 ? (
                <option value="default">Standard (Défaut)</option>
              ) : (
                profiles.map((p) => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name} — {Number(p.price || 0).toLocaleString("fr-FR")} FCFA ({p.session_timeout || "1h"})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Nombre de tickets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre de Tickets à Générer
              </label>
              <span className="text-[10px] font-bold text-slate-400">Max 1 000</span>
            </div>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Génération instantanée dans notre base Cloud.
            </p>
          </div>

          {/* Prix unitaire */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Prix de Vente Unitaire (FCFA)
            </label>
            <input
              type="number"
              min={0}
              step={25}
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Synchronisé avec le forfait sélectionné.
            </p>
          </div>

          {/* Durée de connexion */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Durée Limite (Uptime MikroTik)
            </label>
            <input
              type="text"
              placeholder="Ex: 1h, 2h, 3h, 24h, 7d, 30d"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Syntaxe : <span className="font-bold">h</span> = heures (ex: 4h), <span className="font-bold">d</span> = jours (ex: 7d).
            </p>
          </div>

          {/* Longueur du Code (Strictement 4, 6 ou 8) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Longueur du Code
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8].map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setCodeLength(len as 4 | 6 | 8)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    codeLength === len
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {len} {len === 6 ? "chiffres ★" : "chiffres"}
                </button>
              ))}
            </div>
          </div>

          {/* Format / Type de Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Type d'Alphabet du Code
            </label>
            <select
              value={codeFormat}
              onChange={(e) => setCodeFormat(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="alpha_upper">Alphanumérique MAJUSCULES (ex: 7X8K2M)</option>
              <option value="alpha_lower">Alphanumérique minuscules (ex: 7x8k2m)</option>
              <option value="numeric">Chiffres uniquement (ex: 849201)</option>
            </select>
          </div>

          {/* Préfixe */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Préfixe (Optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: VIP-"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* Commentaire personnalisé du lot */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Commentaire Libre du Lot (Inscrit sur le MikroTik)
            </label>
            <input
              type="text"
              placeholder="Ex: Lot Cybercafé 20 Septembre, Promo Étudiant..."
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* Bouton de validation */}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            >
              <Zap className="w-4 h-4" />
              <span>
                {loading
                  ? "Génération en cours..."
                  : `Générer ${count} Tickets Cloud RADIUS (${price} FCFA / ticket)`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Configuration RADIUS MikroTik 1-Clic */}
      {showRadiusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Raccordement RADIUS MikroTik 1-Clic
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copiez et collez ce script dans le Terminal WinBox / WebFig de votre routeur.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRadiusModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {radiusScriptLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Génération du script sur mesure en cours...
              </div>
            ) : radiusScriptData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Serveur RADIUS TikZone</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {radiusScriptData.radius_server_ip}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Ports Auth / Accounting</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      UDP {radiusScriptData.radius_auth_port} / {radiusScriptData.radius_acct_port}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {radiusScriptData.script}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyRadiusScript}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer border border-slate-700"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le script</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <span>
                    Ce script active le client RADIUS interne de RouterOS, connecte le profil Hotspot au serveur et configure le décompte intermédiaire en temps réel toutes les 3 minutes.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRadiusModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Printable Preview Area */}
      {tickets.length > 0 && (
        <div id="print-area" className="space-y-4">
          <div className="no-print flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500">
              Aperçu avant impression : {tickets.length} tickets prêts à l'emploi
            </span>
          </div>

          {/* Grille A4 Découpable (4 colonnes, cadrage exact non rogné) */}
          <div className="vouchers-grid grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 text-slate-950">
            {tickets.map((t, idx) => {
              const hotspotTitle = (routerData?.hotspot_name || routerData?.name || "TIKZONE HOTSPOT").toUpperCase();
              return (
                <div
                  key={idx}
                  className="voucher-card border-[1.5px] border-slate-900 rounded-md p-2 bg-white text-slate-950 flex flex-col justify-between select-none"
                  style={{ minHeight: "110px" }}
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-tight">
                      <span className="truncate pr-1">{hotspotTitle}</span>
                      <span className="shrink-0 text-[10px]">[{idx + 1}]</span>
                    </div>
                    <div className="border-b-[1.5px] border-slate-900 my-0.5"></div>
                  </div>

                  {/* Body : Code Ticket ou Identifiant/Mot de passe */}
                  <div className="my-auto py-1 text-center space-y-0.5">
                    {t.auth_mode === "dual" && t.password && t.password !== t.code ? (
                      <div className="space-y-1 bg-slate-50 border-[1.5px] border-slate-900 rounded p-1">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-600 uppercase">Utilisateur :</span>
                          <span className="font-mono font-black text-slate-950 text-xs">{t.code}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold border-t border-slate-300 pt-0.5">
                          <span className="text-slate-600 uppercase">Mot de passe :</span>
                          <span className="font-mono font-black text-rose-600 text-xs">{t.password}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                          Code Ticket (PIN)
                        </div>
                        <div className="border-[1.5px] border-slate-900 rounded px-2 py-0.5 text-sm font-black font-mono tracking-widest bg-slate-50">
                          {t.code}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer : Durée & Prix (Toujours visible sans troncature) */}
                  <div className="border-[1.5px] border-slate-900 rounded px-1 py-0.5 text-center text-[10px] font-black uppercase tracking-tight bg-slate-50 mt-0.5">
                    Pass {t.time_limit} — {t.price} FCFA
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
