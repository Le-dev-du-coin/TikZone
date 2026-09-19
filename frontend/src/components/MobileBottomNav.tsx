"use client";

import { CreditCard, Home, PlusCircle, Router as RouterIcon, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/dashboard/routers/new", label: "Routeur+", icon: RouterIcon },
    { href: "/mikhmon/new", label: "Mikhmon+", icon: PlusCircle },
    { href: "/wallet", label: "Solde", icon: CreditCard },
    { href: "/superadmin", label: "Admin", icon: Shield },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-blue-600 font-bold scale-105" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
