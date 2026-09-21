"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, RouterData } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, Plus, Radio, Server } from "lucide-react";

interface RouterSwitcherProps {
  currentRouterId: string;
}

export default function RouterSwitcher({ currentRouterId }: RouterSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [routers, setRouters] = useState<RouterData[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tikzone_cached_routers");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .getRouters()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setRouters(data);
          try {
            localStorage.setItem("tikzone_cached_routers", JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const currentRouter = routers.find((r) => r.id === currentRouterId);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs transition-all text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0"></span>
        <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="max-w-[130px] sm:max-w-[200px] truncate">
          {loading ? "Chargement..." : currentRouter ? currentRouter.name : "Sélectionner un Routeur"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Changer d'Espace Routeur
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {routers.map((r) => {
                const isSelected = r.id === currentRouterId;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/dashboard/routers/${r.id}`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {r.vpn?.assigned_ip || "IP non assignée"}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-600 text-white">
                        Actif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {user?.role !== "CLIENT_MANAGER" && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard/routers/new");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Rattacher un autre routeur</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
