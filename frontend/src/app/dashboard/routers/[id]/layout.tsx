"use client";

import { use, useEffect, useState } from "react";
import RouterSidebar from "@/components/RouterSidebar";
import RouterSwitcher from "@/components/RouterSwitcher";
import { api, RouterData } from "@/lib/api";
import { Menu, Wifi } from "lucide-react";
import Link from "next/link";

interface RouterLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function RouterSpaceLayout({ children, params }: RouterLayoutProps) {
  const resolvedParams = use(params);
  const routerId = resolvedParams.id;

  const [router, setRouter] = useState<RouterData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 flex">
      {/* Dedicated Router Sidebar */}
      <RouterSidebar
        routerId={routerId}
        routerName={router?.name || "Routeur MikroTik"}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-72 transition-all">
        {/* Router Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Router Switcher Dropdown */}
            <RouterSwitcher currentRouterId={routerId} />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-900 rounded-xl transition-colors"
            >
              <span>Hub Principal</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
