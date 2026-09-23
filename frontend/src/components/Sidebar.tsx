"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { formatFCFA } from "@/lib/utils";
import {
  History,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PlusCircle,
  Router as RouterIcon,

  User,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({
  balance = null,
  isOpen = false,
  onClose,
}: {
  balance?: number | null;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0";

  // Ordre logique : Acheter un Espace EN PREMIER, Ajouter Routeur EN SECOND
  const navLinks = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/mikhmon/new",
      label: "Acheter un Espace",
      icon: PlusCircle,
    },
    {
      href: "/dashboard/routers/new",
      label: "Ajouter Routeur",
      icon: RouterIcon,
    },
    {
      href: "/dashboard/wallet",
      label: "Portefeuille & Solde",
      icon: Wallet,
    },
    {
      href: "/dashboard/wallet/history",
      label: "Historique des Paiements",
      icon: History,
    },
    {
      href: "/dashboard/profile",
      label: "Mon Profil & Sécurité",
      icon: User,
    },
  ];

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-slate-950 dark:text-white tracking-tight">TikZone</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                  {appVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestion MikroTik & Hotspot</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wallet Balance Card in Sidebar */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Solde disponible
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-xl font-black text-slate-950 dark:text-white min-h-[28px] flex items-center">
            {balance !== null && balance !== undefined ? (
              formatFCFA(balance)
            ) : (
              <span className="inline-block w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            )}
          </div>
          <Link
            href="/dashboard/wallet"
            onClick={onClose}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Recharger le compte</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Menu Principal
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3">
            <a
              href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27assistance%20technique"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors border border-emerald-200/80 dark:border-emerald-800/50"
            >
              <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Support WhatsApp</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-bold">24/7</span>
            </a>
          </div>
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className="flex items-center gap-3 min-w-0 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-slate-300 flex items-center justify-center font-bold shrink-0 text-sm group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                  {user?.full_name || "Utilisateur"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || "compte@tikzone.net"}</p>
              </div>
            </Link>


            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
