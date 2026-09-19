"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  FileText,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Pencil,
  Printer,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api";

interface RouterSidebarProps {
  routerId: string;
  routerName?: string;
  hotspotName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onRouterUpdated?: (updated: any) => void;
}

export default function RouterSidebar({
  routerId,
  routerName = "Routeur MikroTik",
  hotspotName = "",
  isOpen = false,
  onClose,
  onRouterUpdated,
}: RouterSidebarProps) {
  const pathname = usePathname();
  const [hotspotOpen, setHotspotOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState(hotspotName || routerName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setIsSaving(true);
    try {
      const res = await api.updateRouter(routerId, { hotspot_name: customName.trim() });
      if (onRouterUpdated) onRouterUpdated(res.router);
      setIsEditingName(false);
    } catch (err: any) {
      alert("Erreur lors de la modification : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = hotspotName || routerName;

  const basePath = `/dashboard/routers/${routerId}`;

  const navItems = [
    {
      href: basePath,
      label: "Tableau de bord",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Hotspot",
      icon: Wifi,
      isGroup: true,
      isOpen: hotspotOpen,
      toggle: () => setHotspotOpen(!hotspotOpen),
      children: [
        {
          href: `${basePath}/users`,
          label: "Utilisateurs & Tickets",
          icon: Users,
        },
        {
          href: `${basePath}/profiles`,
          label: "Profils de Débit",
          icon: Gauge,
        },
        {
          href: `${basePath}/active`,
          label: "Sessions Actives",
          icon: Radio,
        },
      ],
    },
    {
      href: `${basePath}/tickets`,
      label: "Générateur & Impression",
      icon: Printer,
    },
    {
      href: `${basePath}/logs`,
      label: "Journaux d'Activité (Logs)",
      icon: ScrollText,
    },
    {
      href: `${basePath}/system`,
      label: "Système & Redémarrage",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Router Header Badge (Nom Programmable de l'Espace) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Espace Routeur
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(displayName);
                    setIsEditingName(true);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  title="Personnaliser le nom commercial de cet espace"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              <h2
                onClick={() => {
                  setCustomName(displayName);
                  setIsEditingName(true);
                }}
                className="font-black text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                title="Cliquez pour renommer"
              >
                {displayName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal d'édition du Nom Programmable */}
        {isEditingName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nom de l'Espace Hotspot</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nom commercial affiché (ex: Hotspot Marché, Wi-Fi Hôtel)
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Hotspot Zone Sud"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ce nom apparaîtra dans votre menu et sur vos tickets imprimés.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Enregistrement..." : "Enregistrer"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Back to Global Hub */}
        <div className="p-3">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>← Retour au Hub Principal</span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Gestion Hotspot
          </div>

          {navItems.map((item, idx) => {
            if (item.isGroup && item.children) {
              return (
                <div key={idx} className="space-y-1">
                  <button
                    type="button"
                    onClick={item.toggle}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {item.isOpen && (
                    <div className="pl-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-4 my-1">
                      {item.children.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSubActive
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? "text-white" : "text-slate-400"}`} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href || "");

            return (
              <Link
                key={item.href || idx}
                href={item.href || "#"}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* WhatsApp Support Button */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <a
            href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27aide%20sur%20mon%20routeur"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Support Technique WhatsApp</span>
          </a>
        </div>
      </aside>
    </>
  );
}
