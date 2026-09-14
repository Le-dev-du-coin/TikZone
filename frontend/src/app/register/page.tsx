"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, Mail, Phone, User, Wifi, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TECHNICIAN" | "OWNER">("OWNER");
  const [country, setCountry] = useState("Mali");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await register({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      country,
      role,
    });

    setIsLoading(false);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setErrorMessage(result.error || "Erreur lors de l'inscription.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Controls */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4">
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
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-md shadow-blue-500/20"
          >
            <Wifi className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Créer un compte</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Rejoignez TikZone pour gérer vos hotspots MikroTik en ligne
          </p>

        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleRegister} suppressHydrationWarning className="space-y-4">
          {/* Role Choice */}
          <div className="space-y-2" suppressHydrationWarning>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Votre Profil *
            </label>
            <div className="grid grid-cols-2 gap-3" suppressHydrationWarning>
              <div
                onClick={() => setRole("OWNER")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  role === "OWNER"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Propriétaire</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Gère son propre hotspot</p>
              </div>

              <div
                onClick={() => setRole("TECHNICIAN")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  role === "TECHNICIAN"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Technicien</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Gère plusieurs clients</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nom complet ou Entreprise
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="ex: Siriman Ass / Wifi Services"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              suppressHydrationWarning
              className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" suppressHydrationWarning>
            <div className="space-y-1.5" suppressHydrationWarning>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email *
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Téléphone (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                autoComplete="tel"
                placeholder="+223 70 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                suppressHydrationWarning
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Mot de passe *
            </label>
            <div className="relative" suppressHydrationWarning>
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            suppressHydrationWarning
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{isLoading ? "Création du compte..." : "Créer mon compte"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Se connecter
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
            Une question avant de vous inscrire ?{" "}
            <a
              href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20je%20souhaite%20des%20renseignements%20sur%20la%20plateforme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Contactez le support (+223 99 28 18 99)
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
