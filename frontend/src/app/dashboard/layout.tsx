"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { walletEvents } from "@/lib/wallet-events";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialisation à partir du cache local pour zéro flash, ou null si première visite
  const [balance, setBalance] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mikroot_last_balance");
      if (cached !== null && !isNaN(Number(cached))) {
        return Number(cached);
      }
    }
    return null;
  });

  // 1. Protection de route : redirection si non connecté
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // 2. Chargement du solde réel depuis l'API et mise en cache
  useEffect(() => {
    async function loadWallet() {
      if (user) {
        try {
          const data = await api.getWallet();
          if (data && typeof data.balance === "number") {
            setBalance(data.balance);
            localStorage.setItem("mikroot_last_balance", String(data.balance));
          }
        } catch {
          // Ignorer si hors-ligne
        }
      }
    }
    loadWallet();

    // 3. Écoute réactive des débits/crédits
    const unsubscribe = walletEvents.subscribe((newBal) => {
      setBalance(newBal);
      localStorage.setItem("mikroot_last_balance", String(newBal));
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
        <p className="text-xs font-semibold">Chargement de votre espace sécurisé...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Espace Routeur Autonome : Pas de sidebar TikZone globale, pas de header global !
  const isRouterWorkspace =
    pathname.startsWith("/dashboard/routers/") && !pathname.endsWith("/new");

  if (isRouterWorkspace) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Left Sidebar */}
      <Sidebar
        balance={balance}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        <Header
          balance={balance}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
