"use client";

import { use, useEffect, useState } from "react";
import RouterSidebar from "@/components/RouterSidebar";
import RouterSwitcher from "@/components/RouterSwitcher";
import { api, RouterData } from "@/lib/api";
import {
  ArrowLeft,
  Copy,
  Menu,
  Server,
  Wifi,
} from "lucide-react";
import Link from "next/link";

interface RouterLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function RouterSpaceLayout({ children, params }: RouterLayoutProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [router, setRouter] = useState<RouterData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedWinbox, setCopiedWinbox] = useState(false);

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

  const winboxAddress = `${router?.vpn?.vpn_server || "vpn.tikzone.net"}:${router?.vpn?.winbox_port || 51001}`;

  const copyWinbox = () => {
    navigator.clipboard.writeText(winboxAddress);
    setCopiedWinbox(true);
    setTimeout(() => setCopiedWinbox(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/40 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Dedicated Router Sidebar (Drawer on mobile, fixed on desktop) */}
      <RouterSidebar
        routerId={routerId}
        routerName={router?.name || "Routeur MikroTik"}
        hotspotName={router?.hotspot_name || ""}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onRouterUpdated={(updated) => setRouter(updated)}
      />

      {/* Main Workspace Area (offset by 72 on desktop, full width on mobile) */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        {/* Router Header (Sticky, Mobile-First) */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger button for mobile drawer */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Ouvrir le menu du routeur"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick switcher between routers */}
            <RouterSwitcher currentRouterId={routerId} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Winbox Quick-connect Chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-slate-500 dark:text-slate-400">Winbox :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {winboxAddress}
              </span>
              <button
                type="button"
                onClick={copyWinbox}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copier l'adresse Winbox"
              >
                <Copy className="w-3 h-3" />
              </button>
              {copiedWinbox && (
                <span className="text-[10px] text-emerald-600 font-bold ml-1">Copié !</span>
              )}
            </div>

            {/* Back to Hub TikZone button */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition-all cursor-pointer"
              title="Retourner à l'accueil TikZone"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Hub TikZone</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
