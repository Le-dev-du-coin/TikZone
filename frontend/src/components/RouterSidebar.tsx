"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Coins,
  Gauge,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

interface RouterSidebarProps {
  routerId: string;
  routerName?: string;
  hotspotName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRouterUpdated?: (updated: any) => void;
}

export default function RouterSidebar({
  routerId,
  routerName = "",
  hotspotName = "",
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: RouterSidebarProps) {
  const pathname = usePathname();
  const [hotspotOpen, setHotspotOpen] = useState(true);
  const displayName = hotspotName || routerName || "Routeur Hotspot";

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
      href: `${basePath}/reports`,
      label: "Rapports & Ventes",
      icon: Coins,
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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col border-r border-slate-200 dark:border-slate-800 transition-all duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-20 w-72" : "w-72"}`}
      >
        {/* Router Header Badge */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? "hidden" : "flex-1"}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Espace Routeur
              </span>
              <h2 className="font-black text-sm text-slate-900 dark:text-white truncate">
                {displayName}
              </h2>
            </div>
          </div>

          {/* Bouton Hamburger de réduction Desktop / Fermeture Mobile */}
          <div className="flex items-center gap-1 shrink-0">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isCollapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale (icônes seules)"}
              >
                {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-blue-600" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>
            )}

            {!isCollapsed && <ThemeToggle />}

            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Back to Global Hub */}
        <div className={`p-3 ${isCollapsed ? "flex justify-center" : ""}`}>
          <Link
            href="/dashboard"
            onClick={onClose}
            title="Retour au Hub Principal TikZone"
            className={`flex items-center gap-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group cursor-pointer ${
              isCollapsed ? "p-2.5 justify-center" : "px-3 py-2"
            }`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            {!isCollapsed && <span>← Retour au Hub</span>}
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5">
              Gestion Hotspot
            </div>
          )}

          {navItems.map((item, idx) => {
            if (item.isGroup && item.children) {
              if (isCollapsed) {
                // En mode replié, afficher directement les icônes enfants pour accès direct en 1-clic
                return (
                  <div key={idx} className="space-y-1 py-1 border-y border-slate-100 dark:border-slate-800/80">
                    {item.children.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onClose}
                          title={sub.label}
                          className={`flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
                            isSubActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                          }`}
                        >
                          <SubIcon className="w-5 h-5" />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

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
                title={item.label}
                className={`flex items-center gap-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCollapsed ? "p-2.5 justify-center" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Support WhatsApp */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <a
            href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27aide%20sur%20mon%20routeur"
            target="_blank"
            rel="noopener noreferrer"
            title="Support Technique WhatsApp"
            className={`flex items-center gap-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors ${
              isCollapsed ? "p-2.5 justify-center" : "px-3 py-2"
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            {!isCollapsed && <span>Support WhatsApp</span>}
          </a>
        </div>
      </aside>
    </>
  );
}
