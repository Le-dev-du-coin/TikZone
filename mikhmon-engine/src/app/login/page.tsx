"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowRight, ShieldCheck, Wifi } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [spaceName, setSpaceName] = useState<string>("");

  useEffect(() => {
    // 1. Détecter l'espace depuis les query params ou le sous-domaine
    const qSpace = searchParams.get("space");
    if (qSpace) {
      setSpaceName(qSpace);
      document.cookie = `mikroot_space=${qSpace}; path=/; max-age=2592000; SameSite=Lax`;
    } else if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 3 || (parts.length === 2 && parts[1] === "localhost")) {
        const sub = parts[0].toLowerCase();
        if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) {
          setSpaceName(sub);
          document.cookie = `mikroot_space=${sub}; path=/; max-age=2592000; SameSite=Lax`;
        }
      }
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      username,
      password,
      space: spaceName || undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Identifiants incorrects pour cet espace.");
    } else {
      router.push(spaceName ? `/?space=${spaceName}` : "/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-slate-900 dark:text-slate-100">
      <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="text-center space-y-2 pt-8 pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Wifi className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">TikZone Hotspot</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gestionnaire de Hotspots MikroTik & Tickets
          </CardDescription>

          {spaceName && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold">
                Espace : {spaceName}.tikzone.net
              </span>
            </div>
          )}

        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-2">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                defaultValue="admin"
                required
                autoComplete="username"
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer gap-2 mt-2"
              disabled={loading}
            >
              <span>{loading ? "Connexion en cours..." : "Accéder à mon espace"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Accès sécurisé et isolé par espace</span>
          </div>

          <div className="mt-3 pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Besoin d'aide ?{" "}
            <a
              href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27assistance%20sur%20mon%20espace%20Hotspot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Support WhatsApp (+223 99 28 18 99)
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

