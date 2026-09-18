"use client";

import { use, useEffect, useState } from "react";
import RouterSwitcher from "@/components/RouterSwitcher";
import { api, RouterData } from "@/lib/api";
import {
  ArrowLeft,
  Gauge,
  LayoutDashboard,
  Printer,
  Radio,
  ScrollText,
  Settings,
  Users,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface RouterLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function RouterSpaceLayout({ children, params }: RouterLayoutProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;
  const pathname = usePathname();

  const [router, setRouter] = useState<RouterData | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getRouters()
      .then((routers) => {
        if (!isMounted) return;
        const current = routers.find((r) => r.id === routerId);
        if (current) setRouter(current);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [routerId]);

  const basePath = `/dashboard/routers/${routerId}`;

  const tabs = [
    {
      href: basePath,
      label: "Tableau de bord",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `${basePath}/users`,
      label: "Utilisateurs & Tickets",
      icon: Users,
    },
    {
      href: `${basePath}/active`,
      label: "Sessions Actives",
      icon: Radio,
    },
    {
      href: `${basePath}/profiles`,
      label: "Profils de Débit",
      icon: Gauge,
    },
    {
      href: `${basePath}/tickets`,
      label: "Générateur & Impression",
      icon: Printer,
    },
    {
      href: `${basePath}/logs`,
      label: "Logs en Direct",
      icon: ScrollText,
    },
    {
      href: `${basePath}/system`,
      label: "Outils & Winbox",
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Router Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Retour au tableau de bord global"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            {/* Dynamic Router Switcher */}
            <RouterSwitcher currentRouterId={routerId} />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">Accès Winbox :</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400">
              vpn.tikzone.net:{router?.vpn?.winbox_port || 51001}
            </span>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Page Content */}
      <div>{children}</div>
    </div>
  );
}
