"use client";

import CopyButton from "@/components/CopyButton";
import MikhmonLaunchModal from "@/components/MikhmonLaunchModal";
import { useAuth } from "@/context/AuthContext";
import { api, InstanceData, RouterData } from "@/lib/api";
import { BASE_DOMAIN } from "@/lib/config";
import { formatFCFA } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Router as RouterIcon,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "CLIENT_MANAGER") {
      if (user.managed_router_id) {
        router.replace(`/dashboard/routers/${user.managed_router_id}`);
      }
    }
  }, [user, router]);

  const [instances, setInstances] = useState<InstanceData[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tikzone_cached_instances");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("tikzone_cached_instances");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        } catch {}
      }
    }
    return true;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING">("ALL");
  const [pingStatus, setPingStatus] = useState<Record<string, string>>({});
  const [showScriptModal, setShowScriptModal] = useState<string | null>(null);
  const [selectedMikhmonModal, setSelectedMikhmonModal] = useState<InstanceData | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // État de confirmation de suppression
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "SPACE" | "ROUTER";
    id: string;
    name: string;
    routersCount?: number;
  } | null>(null);

  // État de confirmation de renouvellement (+30j)
  const [renewTarget, setRenewTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mikroot_last_balance");
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return 0;
  });

  const loadData = async () => {
    try {
      const [data, wallet] = await Promise.all([
        api.getInstances(),
        api.getWallet().catch(() => null),
      ]);
      if (Array.isArray(data)) {
        setInstances(data);
        try {
          localStorage.setItem("tikzone_cached_instances", JSON.stringify(data));
        } catch {}
      }
      if (wallet && typeof wallet.balance === "number") {
        setBalance(wallet.balance);
        try {
          localStorage.setItem("mikroot_last_balance", String(wallet.balance));
        } catch {}
      }
    } catch {
      // Ignorer si pas encore connecté
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`"${label}" copié dans le presse-papier !`, "success");
  };

  const handlePing = async (routerId: string) => {
    setPingStatus((prev) => ({ ...prev, [routerId]: "testing" }));
    try {
      const res = await api.pingRouter(routerId);
      setPingStatus((prev) => ({ ...prev, [routerId]: "online" }));
      showToast(res.detail || "Routeur en ligne !", "success");
    } catch (err: any) {
      setPingStatus((prev) => ({ ...prev, [routerId]: "offline" }));
      showToast(err.message || "Le routeur ne répond pas au ping.", "error");
    } finally {
      setTimeout(() => setPingStatus((prev) => ({ ...prev, [routerId]: "" })), 4000);
    }
  };

  const confirmRenewRouter = async () => {
    if (!renewTarget) return;
    setRenewing(true);
    try {
      const res = await api.renewRouter(renewTarget.id);
      showToast(res.detail || `Routeur « ${renewTarget.name} » renouvelé pour 30 jours !`, "success");
      setRenewTarget(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors du renouvellement", "error");
    } finally {
      setRenewing(false);
    }
  };

  // Modale Accès Client & Envoi WhatsApp
  const [accessModalInstance, setAccessModalInstance] = useState<InstanceData | null>(null);
  const [modalClientName, setModalClientName] = useState("");
  const [modalClientPhone, setModalClientPhone] = useState("");
  const [modalAdminUser, setModalAdminUser] = useState("");
  const [modalAdminPassword, setModalAdminPassword] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);

  const handleOpenClientAccessModal = (inst: InstanceData) => {
    setAccessModalInstance(inst);
    setModalClientName(inst.client_name || "");
    setModalClientPhone(inst.client_phone || "");
    setModalAdminUser(inst.admin_user || "admin");
    setModalAdminPassword(inst.admin_password || "mikroot2026");
  };

  const buildClientLoginUrl = (subdomainName: string, userLogin: string) => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `${window.location.origin}/login?user=${encodeURIComponent(userLogin)}`;
      }
    }
    const cleanSub = subdomainName.toLowerCase().trim();
    return `https://${cleanSub}.tikzone.net/login?user=${encodeURIComponent(userLogin)}`;
  };

  const getSubdomainRouterUrl = (instanceName: string, routerId: string) => {
    const cleanSub = (instanceName || "").toLowerCase().trim();
    if (!cleanSub) return `/dashboard/routers/${routerId}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("mikroot_token") : null;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `/dashboard/routers/${routerId}`;
      }
    }
    return `https://${cleanSub}.tikzone.net/dashboard/routers/${routerId}${tokenParam}`;
  };

  const handleSaveAccess = async (andOpenWhatsApp: boolean = false) => {
    if (!accessModalInstance) return;
    setSavingAccess(true);
    try {
      const cleanUser = modalAdminUser.trim() || "admin";
      const cleanPass = modalAdminPassword.trim() || "mikroot2026";
      const cleanName = modalClientName.trim();
      const cleanPhone = modalClientPhone.trim();

      const updated = await api.updateInstance(accessModalInstance.id, {
        client_name: cleanName,
        client_phone: cleanPhone,
        admin_user: cleanUser,
        admin_password: cleanPass,
      });

      setInstances((prev) =>
        prev.map((i) => (i.id === accessModalInstance.id ? { ...i, ...updated } : i))
      );

      const loginUrl = buildClientLoginUrl(accessModalInstance.name, cleanUser);
      const nameGreeting = cleanName ? ` ${cleanName}` : "";
      const phoneDigits = cleanPhone.replace(/\D/g, "");

      const msg = `Bonjour${nameGreeting},\nVoici votre lien pour gérer vos tickets WiFi Zone (${accessModalInstance.name}) :\n\nLien : ${loginUrl}\nIdentifiant : ${cleanUser}\nMot de passe : ${cleanPass}\n\nEnregistrez vos identifiants pour vous connecter en 1 clic.`;

      if (andOpenWhatsApp) {
        if (phoneDigits) {
          const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const waUrl = isMobile
            ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`
            : `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(msg)}`;
          window.open(waUrl, "_blank");
          showToast(`WhatsApp ouvert pour ${cleanName || accessModalInstance.name} !`, "success");
        } else {
          window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
          showToast("WhatsApp Web ouvert avec le message prêt !", "success");
        }
      } else {
        showToast("Identifiants et contact enregistrés avec succès !", "success");
      }
      setAccessModalInstance(null);
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement des accès", "error");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleCopyModalMessage = async () => {
    if (!accessModalInstance) return;
    const cleanUser = modalAdminUser.trim() || "admin";
    const cleanPass = modalAdminPassword.trim() || "mikroot2026";
    const cleanName = modalClientName.trim();
    const loginUrl = buildClientLoginUrl(accessModalInstance.name, cleanUser);
    const nameGreeting = cleanName ? ` ${cleanName}` : "";

    const msg = `Bonjour${nameGreeting},\nVoici votre lien pour gérer vos tickets WiFi Zone (${accessModalInstance.name}) :\n\nLien : ${loginUrl}\nIdentifiant : ${cleanUser}\nMot de passe : ${cleanPass}\n\nEnregistrez vos identifiants pour vous connecter en 1 clic.`;

    await navigator.clipboard.writeText(msg);
    showToast("Message copié dans le presse-papier !", "success");
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "SPACE") {
      if (deleteTarget.routersCount && deleteTarget.routersCount > 0) {
        showToast(
          `Impossible de supprimer l'espace '${deleteTarget.name}' : il contient encore ${deleteTarget.routersCount} routeur(s) associé(s). Supprimez-les d'abord.`,
          "error"
        );
        setDeleteTarget(null);
        return;
      }

      try {
        const res = await api.deleteInstance(deleteTarget.id);
        showToast(res.detail || "Espace supprimé avec succès !", "success");
        setInstances((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      } catch (err: any) {
        showToast(err.message || "Erreur lors de la suppression de l'espace", "error");
      }
    } else if (deleteTarget.type === "ROUTER") {
      try {
        const res = await api.deleteRouter(deleteTarget.id);
        showToast(res.detail || "Routeur supprimé avec succès !", "success");
        setInstances((prev) =>
          prev.map((inst) => ({
            ...inst,
            routers: (inst.routers || []).filter((r) => r.id !== deleteTarget.id),
          }))
        );
      } catch (err: any) {
        showToast(err.message || "Erreur lors de la suppression du routeur", "error");
      }
    }

    setDeleteTarget(null);
  };

  const totalRoutersCount = instances.reduce((acc, inst) => acc + (inst.routers ? inst.routers.length : 0), 0);
  const expiringRoutersCount = instances
    .flatMap((inst) => inst.routers || [])
    .filter((r) => r.days_left <= 7).length;

  const filteredInstances = instances
    .map((inst) => {
      let filteredRouters = (inst.routers || []).filter((r) => {
        if (activeFilter === "EXPIRING") {
          return r.days_left <= 7;
        }
        return true;
      });

      if (searchTerm) {
        filteredRouters = filteredRouters.filter(
          (r) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.vpn?.api_port && r.vpn.api_port.toString().includes(searchTerm))
        );
      }

      return { ...inst, routers: filteredRouters };
    })
    .filter((inst) => (inst.routers && inst.routers.length > 0) || (activeFilter === "ALL" && !searchTerm));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification (Haut Droite pour ne jamais chevaucher le bouton WhatsApp) */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-5 duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-700"
              : "bg-rose-600 text-white border border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* KPI Header - Ultra compact & responsive */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
              Espaces
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{instances.length}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Réseaux configurés</p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 self-end sm:self-center">
            <Server className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
              Routeurs
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalRoutersCount}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Tunnels VPN actifs</p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 self-end sm:self-center">
            <RouterIcon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
              Renouveler
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{expiringRoutersCount}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">&lt; 7 jours restants</p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 self-end sm:self-center">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>Tous les Espaces ({instances.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter("EXPIRING")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "EXPIRING"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>À renouveler ({expiringRoutersCount})</span>
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher espace, routeur, port..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mikhmon Spaces & Routers Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-xs text-slate-500">
            Chargement de vos espaces et routeurs en cours...
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Aucun routeur connecté</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Raccordez votre premier boîtier MikroTik pour démarrer la supervision et générer des tickets.
              </p>
            </div>
            <Link
              href="/dashboard/routers/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Connecter un Routeur MikroTik (500 CFA/mois)</span>
            </Link>
          </div>
        ) : (
          filteredInstances.map((instance) => {
            const routers = instance.routers || [];

            return (
              <div
                key={instance.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Space Header */}
                <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                        <Server className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-black text-sm sm:text-lg text-slate-900 dark:text-white break-all">
                            {instance.name}.{BASE_DOMAIN}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            ROS {instance.routeros_version}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-medium">
                            {routers.length} routeur(s) connecté(s)
                          </span>
                          {instance.client_name && (
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-750 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <UserCheck className="w-3 h-3 text-blue-500" />
                              <span>{instance.client_name}</span>
                            </span>
                          )}
                          {instance.client_phone && (
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <Phone className="w-3 h-3" />
                              <span>{instance.client_phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Space Button (accessible on mobile top right) */}
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: "SPACE",
                          id: instance.id,
                          name: instance.name,
                          routersCount: routers.length,
                        })
                      }
                      className="lg:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Supprimer cet espace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenClientAccessModal(instance)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 transition-colors shadow-2xs cursor-pointer"
                      title="Configurer les accès client et envoyer par WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Accès Client & WhatsApp</span>
                    </button>

                    <Link
                      href={`/dashboard/routers/new?space=${instance.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Ajouter Routeur</span>
                    </Link>

                    {routers.length > 0 ? (
                      <a
                        href={getSubdomainRouterUrl(instance.name, routers[0].id)}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        title="Ouvrir l'Espace Hotspot de ce routeur"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Espace Hotspot</span>
                      </a>
                    ) : (
                      <Link
                        href={`/dashboard/routers/new?space=${instance.id}`}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Rattacher Routeur</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: "SPACE",
                          id: instance.id,
                          name: instance.name,
                          routersCount: routers.length,
                        })
                      }
                      className="hidden lg:inline-flex p-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer cet espace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Routers Grid */}
                <div className="p-4 sm:p-6 space-y-4">
                  {routers.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Aucun routeur rattaché à cet espace pour le moment.
                      </p>
                      <Link
                        href={`/dashboard/routers/new?space=${instance.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Rattacher un routeur MikroTik (500 CFA/mois)</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                      {routers.map((router) => {
                        const daysLeft = router.days_left ?? 30;
                        const isExpiringSoon = daysLeft <= 7;

                        const vpnServer = router.vpn?.vpn_server || "vpn.tikzone.net";
                        const apiPort = router.vpn?.api_port || 41001;
                        const winboxPort = router.vpn?.winbox_port || 51001;
                        const apiEndpoint = `${vpnServer}:${apiPort}`;
                        const winboxEndpoint = `${vpnServer}:${winboxPort}`;

                        return (
                          <div
                            key={router.id}
                            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all space-y-3.5 shadow-2xs"
                          >
                            {/* Router Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0"></span>
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                    {router.name}
                                  </h4>
                                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    Tunnel WireGuard / L2TP
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black rounded-full border shrink-0 ${
                                  isExpiringSoon
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                }`}
                              >
                                {router.expires_at_formatted
                                  ? `Expire le ${router.expires_at_formatted} (${daysLeft}j)`
                                  : `${daysLeft}j restants`}
                              </span>
                            </div>

                            {/* Actions Responsive Layout */}
                            <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <a
                                href={getSubdomainRouterUrl(instance.name, router.id)}
                                className="col-span-4 sm:flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                              >
                                <Wifi className="w-3.5 h-3.5" />
                                <span>Gérer le Hotspot</span>
                              </a>

                              <button
                                type="button"
                                onClick={() =>
                                  setShowScriptModal(
                                    router.vpn?.mikrotik_script ||
                                      router.script ||
                                      `/interface l2tp-client add connect-to=vpn.tikzone.net name=${router.name}-VPN user=${router.name} password=secret disabled=no\n/ip firewall filter add action=accept chain=input in-interface=${router.name}-VPN comment="TikZone VPN"`
                                  )
                                }
                                className="col-span-1 sm:col-auto py-2 px-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[11px] sm:text-xs rounded-xl transition-colors cursor-pointer text-center"
                              >
                                Script
                              </button>

                              <button
                                type="button"
                                onClick={() => setRenewTarget({ id: router.id, name: router.name })}
                                className="col-span-1 sm:col-auto py-2 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] sm:text-xs rounded-xl transition-colors cursor-pointer text-center"
                                title="Prolonger de 30 jours (500 FCFA)"
                              >
                                +30j
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePing(router.id)}
                                disabled={pingStatus[router.id] === "testing"}
                                className="col-span-1 sm:col-auto py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] sm:text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                {pingStatus[router.id] === "testing" ? (
                                  <span className="text-[10px] sm:text-[11px]">Test...</span>
                                ) : pingStatus[router.id] === "online" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] sm:text-[11px]">OK</span>
                                ) : (
                                  <span className="text-[10px] sm:text-[11px]">Ping</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "ROUTER",
                                    id: router.id,
                                    name: router.name,
                                  })
                                }
                                className="col-span-1 sm:col-auto p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                title="Supprimer ce routeur"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-1 z-10">
              <div className="flex items-center gap-2.5 font-black text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3>Script MikroTik (RouterOS 7 WireGuard)</h3>
              </div>
              <button
                onClick={() => setShowScriptModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ouvrez Winbox, allez dans <strong>New Terminal</strong> et collez le script ci-dessous :
            </p>

            <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{showScriptModal}</pre>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-emerald-900 dark:text-emerald-300 font-medium">
                Besoin d'aide pour injecter ce script sur votre boîtier MikroTik ?
              </span>
              <a
                href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27aide%20pour%20configurer%20le%20script%20VPN%20MikroTik"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shrink-0 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Aide WhatsApp (+223 99 28 18 99)</span>
              </a>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowScriptModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Fermer
              </button>
              <CopyButton text={showScriptModal} label="Copier le script complet" />
            </div>

          </div>
        </div>
      )}

      {/* Mikhmon Launch & Session Helper Modal */}
      {selectedMikhmonModal && (
        <MikhmonLaunchModal
          instance={selectedMikhmonModal}
          onClose={() => setSelectedMikhmonModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3>Confirmer la suppression</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {deleteTarget.type === "SPACE" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer l'Espace TikZone <strong>{deleteTarget.name}</strong> ?
                  {deleteTarget.routersCount && deleteTarget.routersCount > 0 ? (
                    <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400">
                      ⚠️ Attention : Cet espace contient {deleteTarget.routersCount} routeur(s). Vous devez supprimer ses routeurs avant de pouvoir supprimer l'espace.
                    </span>
                  ) : (
                    <span className="block mt-2 text-slate-500">
                      Cet espace est vide et sera supprimé définitivement.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer le routeur <strong>{deleteTarget.name}</strong> ? Ses ports VPN seront immédiatement libérés.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Confirmation Modal (+30j) */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Prolonger l'abonnement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Routeur : <strong>{renewTarget.name}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Durée ajoutée :</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+30 jours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Montant du prélèvement :</span>
                <span className="font-black font-mono text-slate-900 dark:text-white">500 FCFA</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500">Solde portefeuille :</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{formatFCFA(balance)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Le montant de 500 FCFA sera directement débité de votre solde et 30 jours de validité supplémentaires seront ajoutés à ce routeur.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                disabled={renewing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRenewRouter}
                disabled={renewing || balance < 500}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                  balance < 500
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                }`}
              >
                {renewing ? "Prolongation..." : balance < 500 ? "Solde insuffisant" : "Confirmer (+30j / 500 F)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Access & WhatsApp Modal */}
      {accessModalInstance && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Accès Client & Envoi WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Espace : <strong>{accessModalInstance.name}.tikzone.net</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccessModalInstance(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Nom du propriétaire (Client)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Mamadou Diallo"
                    value={modalClientName}
                    onChange={(e) => setModalClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Numéro WhatsApp (+223...)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: +223 70 12 34 56"
                    value={modalClientPhone}
                    onChange={(e) => setModalClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Identifiant de connexion
                  </label>
                  <input
                    type="text"
                    placeholder="ex: admin ou nom_client"
                    value={modalAdminUser}
                    onChange={(e) => setModalAdminUser(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Mot de passe de l'espace
                  </label>
                  <input
                    type="text"
                    placeholder="ex: mikroot2026"
                    value={modalAdminPassword}
                    onChange={(e) => setModalAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Aperçu du message WhatsApp */}
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                    Aperçu du message WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyModalMessage}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copier</span>
                  </button>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-line font-sans">
                  {`Bonjour${modalClientName.trim() ? ` ${modalClientName.trim()}` : ""},\nVoici votre lien pour gérer vos tickets WiFi Zone (${accessModalInstance.name}) :\n\nLien : ${buildClientLoginUrl(accessModalInstance.name, modalAdminUser.trim() || "admin")}\nIdentifiant : ${modalAdminUser.trim() || "admin"}\nMot de passe : ${modalAdminPassword.trim() || "mikroot2026"}\n\nEnregistrez vos identifiants pour vous connecter en 1 clic.`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAccessModalInstance(null)}
                disabled={savingAccess}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSaveAccess(false)}
                disabled={savingAccess}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {savingAccess ? "Sauvegarde..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => handleSaveAccess(true)}
                disabled={savingAccess}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{savingAccess ? "Enregistrement..." : "📱 Enregistrer & Ouvrir WhatsApp Web"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
