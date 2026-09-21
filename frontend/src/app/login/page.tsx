"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, Mail, User, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userParam = searchParams.get("user") || searchParams.get("email");
    if (userParam) {
      setIdentifier(userParam);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await login(identifier.trim(), password);
    setIsLoading(false);

    if (result.success) {
      try {
        const cached = localStorage.getItem("mikroot_user");
        if (cached) {
          const user = JSON.parse(cached);
          if (user.role === "CLIENT_MANAGER" && user.managed_router_id) {
            router.push(`/dashboard/routers/${user.managed_router_id}`);
            return;
          }
        }
      } catch {}
      router.push("/dashboard");
    } else {
      setErrorMessage(result.error || "Identifiant ou mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Controls */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l'accueil</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>

      <div
        suppressHydrationWarning
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-md shadow-blue-500/20"
          >
            <Wifi className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Connexion</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Accédez à votre espace d'exploitation TikZone
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} suppressHydrationWarning className="space-y-4">
          <div className="space-y-1.5" suppressHydrationWarning>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Email ou Identifiant
            </label>
            <div className="relative" suppressHydrationWarning>
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="username"
                required
                autoComplete="username"
                placeholder="Ex: amadou ou email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mot de passe
              </label>
            </div>
            <div className="relative" suppressHydrationWarning>
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            suppressHydrationWarning
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{isLoading ? "Connexion en cours..." : "Se connecter"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Créer un compte
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
            Besoin d'aide ?{" "}
            <a
              href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27assistance%20pour%20me%20connecter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Support WhatsApp (+223 99 28 18 99)
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
