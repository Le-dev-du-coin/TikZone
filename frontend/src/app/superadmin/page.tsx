"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { formatFCFA } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Layers,
  Router as RouterIcon,
  Save,
  Search,
  Shield,
  Sliders,
  Users,
  Wallet,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/superadmin");
      } else if (user.role !== "SUPERADMIN") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);
  const [instancePrice, setInstancePrice] = useState("1000");
  const [routerPrice, setRouterPrice] = useState("500");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const [adjustModalClient, setAdjustModalClient] = useState<{ id: string; email: string; balance: number } | null>(null);
  const [adjustAction, setAdjustAction] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustAmount, setAdjustAmount] = useState("5000");
  const [adjustReason, setAdjustReason] = useState("Régularisation paiement Wave / Reçu");
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const kpis = {
    totalRevenue: 245000,
    totalDeposits: 480000,
    totalUsers: 142,
    techniciansCount: 38,
    ownersCount: 104,
    totalInstances: 89,
    activeRouters: 126,
  };

  const [clients, setClients] = useState([
    {
      id: "c-1",
      full_name: "Siriman Ass",
      email: "sirimanass@tikzone.net",
      phone: "+223 70 00 00 00",

      country: "Mali",
      role: "TECHNICIAN",
      role_display: "Technicien",
      wallet_balance: 5000,
      instances_count: 2,
      routers_count: 3,
      created_at: "17/08/2026",
    },
    {
      id: "c-2",
      full_name: "Dembele Services",
      email: "contact@dembeleservices.com",
      phone: "+223 76 11 22 33",
      country: "Mali",
      role: "TECHNICIAN",
      role_display: "Technicien",
      wallet_balance: 1500,
      instances_count: 3,
      routers_count: 5,
      created_at: "01/08/2026",
    },
    {
      id: "c-3",
      full_name: "Hotel de l'Étoile",
      email: "direction@hotel-etoile.sn",
      phone: "+221 77 00 11 22",
      country: "Sénégal",
      role: "OWNER",
      role_display: "Propriétaire",
      wallet_balance: 0,
      instances_count: 1,
      routers_count: 2,
      created_at: "24/08/2026",
    },
  ]);

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAdjustWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalClient) return;

    const num = parseFloat(adjustAmount) || 0;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === adjustModalClient.id) {
          const newBal = adjustAction === "CREDIT" ? c.wallet_balance + num : Math.max(0, c.wallet_balance - num);
          return { ...c, wallet_balance: newBal };
        }
        return c;
      })
    );

    setAdjustSuccess(`Solde de ${adjustModalClient.email} ${adjustAction === "CREDIT" ? "crédité" : "débité"} de ${formatFCFA(num)}.`);
    setTimeout(() => {
      setAdjustSuccess(null);
      setAdjustModalClient(null);
    }, 2000);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.country.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">Espace SuperAdmin TikZone</h1>

            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Supervision globale, gestion des clients, des soldes et des tarifs de la plateforme.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Global Revenue KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-tr from-slate-950 to-slate-850 rounded-3xl p-5 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase tracking-wider">
              <span>Chiffre d'Affaires</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">{formatFCFA(kpis.totalRevenue)}</div>
            <p className="text-[11px] opacity-70 mt-1">Généré par achats et abonnements</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Clients Inscrits</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{kpis.totalUsers}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-blue-600 dark:text-blue-400">🔧 {kpis.techniciansCount} Techniciens</span>
              <span>•</span>
              <span className="text-slate-700 dark:text-slate-300">📱 {kpis.ownersCount} Propriétaires</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Espaces Mikhmon</span>
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{kpis.totalInstances}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sous-domaines clients actifs</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Routeurs en Ligne</span>
              <RouterIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.activeRouters}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Tunnels VPN opérationnels</p>
          </div>
        </div>

        {/* Dynamic Pricing Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2>Configuration des Tarifs de la Plateforme</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ces tarifs s'appliquent immédiatement à l'ensemble des nouveaux achats et renouvellements sur le SaaS.
          </p>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Nouveaux tarifs enregistrés en base de données !</span>
            </div>
          )}

          <form onSubmit={handleSavePrices} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Prix d'un Espace Mikhmon (FCFA)
              </label>
              <input
                type="number"
                required
                step="100"
                value={instancePrice}
                onChange={(e) => setInstancePrice(e.target.value)}
                className="w-full px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Paiement unique pour l'allocation du sous-domaine.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Prix mensuel par routeur (FCFA / mois)
              </label>
              <input
                type="number"
                required
                step="50"
                value={routerPrice}
                onChange={(e) => setRouterPrice(e.target.value)}
                className="w-full px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Abonnement pour le tunnel VPN et les ports 41xxx/51xxx.</p>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les tarifs</span>
              </button>
            </div>
          </form>
        </div>

        {/* Client Management Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Gestion des Clients & Crédits</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Consultez les clients, leurs soldes et ajustez leurs crédits manuellement.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Clients Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 rounded-l-xl">Client</th>
                  <th className="py-3 px-3">Rôle</th>
                  <th className="py-3 px-3">Pays</th>
                  <th className="py-3 px-3">Solde Wallet</th>
                  <th className="py-3 px-3">Espaces</th>
                  <th className="py-3 px-3">Routeurs</th>
                  <th className="py-3 px-3">Inscrit le</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{client.full_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{client.email}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          client.role === "TECHNICIAN"
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                            : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {client.role_display}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">{client.country}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{formatFCFA(client.wallet_balance)}</td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">{client.instances_count}</td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">{client.routers_count}</td>
                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">{client.created_at}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setAdjustModalClient({ id: client.id, email: client.email, balance: client.wallet_balance });
                          setAdjustAmount("5000");
                        }}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        Ajuster Solde
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjust Wallet Modal */}
        {adjustModalClient && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-150 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3>Ajuster le Solde Client</h3>
                </div>
                <button
                  onClick={() => setAdjustModalClient(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1">
                <div><strong>Client :</strong> {adjustModalClient.email}</div>
                <div><strong>Solde actuel :</strong> {formatFCFA(adjustModalClient.balance)}</div>
              </div>

              {adjustSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  {adjustSuccess}
                </div>
              )}

              <form onSubmit={handleAdjustWallet} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction("CREDIT")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      adjustAction === "CREDIT"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    + Créditer (Ajouter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction("DEBIT")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      adjustAction === "DEBIT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    - Débiter (Retirer)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Motif d'audit
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalClient(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Confirmer l'opération
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
