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
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: any) => p.name?.toLowerCase() !== "default");
          }
        }
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
  const [isActive, setIsActive] = useState(true);
  const [comment, setComment] = useState("");

  const loadData = async () => {
    try {
      const res = await api.getRouterProfiles(routerId);
      const parsed = (res.results || []).filter((p: any) => p.name?.toLowerCase() !== "default");
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
    setRateLimit(""); // Illimité par défaut
    setSharedUsers(1);
    setSessionTimeout("1h");
    setPrice(100);
    setIsActive(true);
    setComment("");
    setErrorMsg(null);
    setMessage(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProfile(p);
    setName(p.name);
    const isUnl = !p.rate_limit || p.rate_limit.toLowerCase() === "illimité";
    setRateLimit(isUnl ? "" : p.rate_limit);
    setSharedUsers(parseInt(p.shared_users) || 1);
    setSessionTimeout(p.session_timeout || "1h");
    setPrice(parseInt(p.price) || 100);
    setIsActive(p.is_active !== undefined ? !!p.is_active : true);
    setComment(p.comment || "");
    setErrorMsg(null);
    setMessage(null);
  };

  const handleToggleActive = async (p: any) => {
    const nextStatus = !p.is_active;
    try {
      await api.updateRouterProfile(routerId, {
        id: p.id,
        is_active: nextStatus,
      });
      setProfiles((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: nextStatus } : item))
      );
      setMessage(`Forfait '${p.name}' ${nextStatus ? "activé pour la vente" : "désactivé"}.`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de modifier le statut du forfait.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cleanRate = rateLimit.trim();
      await api.createRouterProfile(routerId, {
        name: name.trim(),
        rate_limit: cleanRate ? cleanRate : "Illimité",
        shared_users: sharedUsers,
        session_timeout: sessionTimeout || "1h",
        price: price,
        is_active: isActive,
        comment: comment.trim(),
      });
      setMessage(`Forfait '${name}' créé avec succès !`);
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
      const cleanRate = rateLimit.trim();
      await api.updateRouterProfile(routerId, {
        id: editingProfile.id,
        name: name.trim() || undefined,
        rate_limit: cleanRate ? cleanRate : "Illimité",
        shared_users: sharedUsers,
        session_timeout: sessionTimeout || undefined,
        price: price,
        is_active: isActive,
        comment: comment.trim(),
      });
      setMessage(`Forfait '${editingProfile.name}' mis à jour.`);
      setEditingProfile(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (profileId: string, profileName: string) => {
    if (!confirm(`Supprimer définitivement le forfait '${profileName}' ?`)) return;
    try {
      await api.deleteRouterProfile(routerId, profileId);
      setMessage(`Forfait '${profileName}' supprimé avec succès.`);
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
            <span>Forfaits Hotspot Cloud (RADIUS)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos forfaits de connexion centralisés dans le Cloud : prix exacts en FCFA, débits et durées de session.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouveau Forfait</span>
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
                <th className="px-5 py-3.5">Statut Vente</th>
                <th className="px-5 py-3.5">Nom du Forfait</th>
                <th className="px-5 py-3.5">Prix Unitaire</th>
                <th className="px-5 py-3.5">Débit (Rate Limit)</th>
                <th className="px-5 py-3.5">Durée Session</th>
                <th className="px-5 py-3.5">Appareils</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Chargement des forfaits Cloud...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Aucun forfait configuré. Cliquez sur "+ Nouveau Forfait" pour commencer.
                  </td>
                </tr>
              ) : (
                profiles.map((p, idx) => {
                  const isEnabled = p.is_active !== undefined ? !!p.is_active : true;
                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Toggle Enabled / is_active */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            isEnabled
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                          title={isEnabled ? "Cliquez pour désactiver" : "Cliquez pour activer"}
                        >
                          <span className={`w-2 h-2 rounded-full ${isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{isEnabled ? "Actif (En vente)" : "Désactivé"}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black">
                            {p.name}
                          </span>
                          {p.comment && (
                            <span className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                              {p.comment}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-black text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{Number(p.price || 0).toLocaleString("fr-FR")} FCFA</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {p.rate_limit && p.rate_limit !== "Illimité" ? p.rate_limit : "Illimité"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200/60 dark:border-amber-800/60">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{p.session_timeout || "1h"}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {p.shared_users || 1} appareil(s)
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                            title="Modifier le forfait"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer le forfait"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                  {editingProfile ? `Modifier le Forfait '${editingProfile.name}'` : "Nouveau Forfait Hotspot Cloud"}
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
                  Nom du Forfait *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1 Heure, Pass 24 Heures, 1 Mois"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prix de Vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Débit Max (Bande passante)</span>
                  <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {rateLimit ? rateLimit : "Illimité"}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: "Illimité", val: "" },
                    { label: "1M/1M", val: "1M/1M" },
                    { label: "2M/2M", val: "2M/2M" },
                    { label: "5M/5M", val: "5M/5M" },
                    { label: "10M/10M", val: "10M/10M" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRateLimit(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        rateLimit === preset.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Personnalisé (ex: 3M/3M) ou laisser vide pour Illimité"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Durée de Connexion *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1h, 3h, 24h, 30d"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format : 30m, 1h, 24h, 7d</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Note (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Forfait jour rapide"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Toggle Actif / En Vente */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Disponible à la vente (Actif)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ce forfait apparaîtra dans le générateur de tickets
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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
                  {submitting ? "Enregistrement..." : editingProfile ? "Sauvegarder" : "Créer le Forfait"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
