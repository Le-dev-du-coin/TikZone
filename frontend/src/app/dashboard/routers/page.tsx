"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Wifi } from "lucide-react";

export default function RoutersIndexPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // 1. Si rôle CLIENT_MANAGER : diriger vers son routeur géré unique
    if (user?.role === "CLIENT_MANAGER" && user.managed_router_id) {
      router.replace(`/dashboard/routers/${user.managed_router_id}`);
      return;
    }

    // 2. Si non connecté, vers le login
    if (!user) {
      router.replace("/login");
      return;
    }

    // 3. Récupérer les routeurs actifs pour rediriger vers le premier
    api
      .getRouters()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          router.replace(`/dashboard/routers/${list[0].id}`);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        router.replace("/dashboard");
      });
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse">
        <Wifi className="w-6 h-6" />
      </div>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        Redirection vers votre routeur Hotspot...
      </p>
    </div>
  );
}
