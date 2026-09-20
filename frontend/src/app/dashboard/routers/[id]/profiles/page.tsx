"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RouterProfilesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [profiles, setProfiles] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tikzone_cached_profiles_${routerId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => profiles.length === 0);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales Création / Édition
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire state
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState("");
  const [sharedUsers, setSharedUsers] = useState(1);
  const [sessionTimeout, setSessionTimeout] = useState("");
  const [price, setPrice] = useState(100);

  const loadData = async () => {
    try {
      const res = await api.getRouterProfiles(routerId);
      const parsed = res.results || [];
      setProfiles(parsed);
      try {
        localStorage.setItem(`tikzone_cached_profiles_${routerId}`, JSON.stringify(parsed));
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routerId]);

  const handleOpenAdd = () => {
    setName("");
    setRateLimit("2M/2M");
    setSharedUsers(1);
    setSessionTimeout("1h");
    setPrice(100);
    setErrorMsg(null);
    setMessage(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProfile(p);
    setName(p.name);
    setRateLimit(p.rate_limit && p.rate_limit !== "Illimité" ? p.rate_limit : "");
    setSharedUsers(parseInt(p.shared_users) || 1);
    const initialTimeout = p.raw_session_timeout && p.raw_session_timeout !== "-" 
      ? p.raw_session_timeout 
      : (p.session_timeout && !p.session_timeout.includes("Illimit") ? p.session_timeout : "");
    setSessionTimeout(initialTimeout);
    const parsedPrice = parseInt(p.price) || 100;
    setPrice(parsedPrice);
    setErrorMsg(null);
    setMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createRouterProfile(routerId, {
        name: name.trim(),
        rate_limit: rateLimit || undefined,
        shared_users: sharedUsers,
        session_timeout: sessionTimeout || undefined,
        price: price,
      });
      setMessage(`Profil '${name}' créé avec succès sur le MikroTik !`);
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.updateRouterProfile(routerId, {
        id: editingProfile.id,
        name: name.trim() || undefined,
        rate_limit: rateLimit || undefined,
        shared_users: sharedUsers,
        session_timeout: sessionTimeout || undefined,
        price: price,
      });
      setMessage(`Profil '${editingProfile.name}' mis à jour.`);
      setEditingProfile(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (profileId: string, profileName: string) => {
    if (!confirm(`Supprimer définitivement le profil '${profileName}' du MikroTik ?`)) return;
    try {
      await api.deleteRouterProfile(routerId, profileId);
      setMessage(`Profil '${profileName}' supprimé avec succès.`);
      loadData();
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Gauge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Profils Hotspot & Tarifications</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configurez les profils de bande passante, durées de validité et prix de vente de vos forfaits Wi-Fi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouveau Profil</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Actualiser</span>
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

      {/* Profiles Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Nom du Profil</th>
                <th className="px-5 py-3.5">Prix Forfait</th>
                <th className="px-5 py-3.5">Débit (Rate Limit)</th>
                <th className="px-5 py-3.5">Validité / Expiration</th>
                <th className="px-5 py-3.5">Appareils</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading && profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Lecture des profils RouterOS...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Aucun profil configuré pour l'instant.
                  </td>
                </tr>
              ) : (
                profiles.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white font-sans text-sm">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                        {p.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{p.price || "100 FCFA"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {p.rate_limit && p.rate_limit !== "Illimité" ? p.rate_limit : "Illimité"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200/60 dark:border-amber-800/60 font-sans">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{p.session_timeout || "Illimitée"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      {p.shared_users} appareil(s)
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Modifier le profil"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {p.name !== "default" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer le profil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉER OU MODIFIER */}
      {(showAddModal || editingProfile) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {editingProfile ? `Modifier le Profil '${editingProfile.name}'` : "Nouveau Profil Hotspot"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProfile(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingProfile ? handleUpdate : handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du Profil
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1h_100F, 24h_500F, Illimite"
                  value={name}
                  disabled={editingProfile?.name === "default"}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prix de Vente (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 100)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Appareils Simultanés
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={sharedUsers}
                    onChange={(e) => setSharedUsers(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Débit Max / Rate Limit (Upload/Download)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2M/2M, 512k/2M, 5M/10M"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format : Upload/Download (ex: 2M/2M pour 2 Mbps)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Durée de Session / Expiration (Uptime)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1h, 2h, 1d, 7d"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Exemples : 30m, 1h, 2h30m, 1d (laisser vide si continu)</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProfile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : editingProfile ? "Sauvegarder" : "Créer le Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
