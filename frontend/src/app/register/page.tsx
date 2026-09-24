"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  Wifi,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { registerInit, registerConfirm, registerResend } = useAuth();

  // Étape 1 : Formulaire
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TECHNICIAN" | "OWNER">("OWNER");
  const [country, setCountry] = useState("Mali");

  // Étape 2 : OTP
  const [otpId, setOtpId] = useState<string>("");
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // États généraux
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Décompte pour renvoi de l'OTP (60s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus sur le 1er champ OTP au passage à l'étape 2
  useEffect(() => {
    if (step === "OTP" && otpInputsRef.current[0]) {
      otpInputsRef.current[0]?.focus();
    }
  }, [step]);

  // 1. Initialisation de l'inscription -> Génération OTP
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsLoading(true);

    const res = await registerInit({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      country,
      role,
    });

    setIsLoading(false);

    if (res.success && res.otp_id) {
      setOtpId(res.otp_id);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setResendCooldown(60);
      setStep("OTP");
    } else {
      setErrorMessage(res.error || "Impossible d'initier l'inscription.");
    }
  };

  // 2. Gestion des inputs OTP à 6 chiffres
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, ""); // Accepter uniquement les chiffres

    // Cas du copier-coller d'un code complet à 6 chiffres
    if (cleanVal.length > 1) {
      const pasteDigits = cleanVal.slice(0, 6).split("");
      const newOtp = [...otpValues];
      pasteDigits.forEach((digit, i) => {
        newOtp[i] = digit;
      });
      setOtpValues(newOtp);
      const nextIdx = Math.min(pasteDigits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otpValues];
    newOtp[index] = cleanVal;
    setOtpValues(newOtp);

    // Déplacement vers l'input suivant
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // 3. Remplissage automatique en Sandbox
  const handleFillDevOtp = () => {
    if (!devOtp || devOtp.length !== 6) return;
    setOtpValues(devOtp.split(""));
    otpInputsRef.current[5]?.focus();
  };

  // 4. Renvoi du code OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending || !otpId) return;
    setErrorMessage(null);
    setIsResending(true);

    const res = await registerResend(otpId);
    setIsResending(false);

    if (res.success) {
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setOtpValues(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setSuccessInfo("Un nouveau code de vérification vous a été envoyé.");
      otpInputsRef.current[0]?.focus();
    } else {
      setErrorMessage(res.error || "Erreur lors du renvoi du code.");
    }
  };

  // 5. Confirmation finale et activation du compte
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const fullCode = otpValues.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Veuillez saisir les 6 chiffres du code reçu.");
      return;
    }

    setIsLoading(true);
    const res = await registerConfirm(otpId, fullCode);
    setIsLoading(false);

    if (res.success) {
      setSuccessInfo("Votre compte a été activé avec succès ! Redirection...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } else {
      setErrorMessage(res.error || "Code incorrect ou expiré.");
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
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-md shadow-blue-500/20"
          >
            <Wifi className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            {step === "FORM" ? "Créer un compte TikZone" : "Vérification de sécurité"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {step === "FORM"
              ? "Rejoignez la plateforme Cloud pour gérer vos hotspots MikroTik"
              : `Code de validation envoyé par SMS / WhatsApp au ${phone}`}
          </p>
        </div>

        {/* Messages Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* ÉTAPE 1 : Formulaire d'inscription */}
        {step === "FORM" && (
          <form onSubmit={handleInitiateRegister} suppressHydrationWarning className="space-y-4">
            {/* Profil */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Votre Profil *
              </label>
              <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nom complet ou Entreprise *
              </label>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="ex: Siriman Ass / Wifi Services"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Téléphone (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+223 70 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{isLoading ? "Envoi du code..." : "Continuer vers la vérification"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : Saisie du Code OTP */}
        {step === "OTP" && (
          <form onSubmit={handleConfirmOtp} className="space-y-6 animate-in fade-in duration-300">
            {/* Sandbox Helper Badge */}
            {devOtp && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Sandbox / Test OTP : <strong>{devOtp}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDevOtp}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline cursor-pointer"
                >
                  Remplir automatiquement
                </button>
              </div>
            )}

            {/* OTP 6-digits input */}
            <div className="space-y-3">
              <label className="block text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Code secret à 6 chiffres
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-slate-50 dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* Actions OTP */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || otpValues.join("").length !== 6}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isLoading ? "Validation en cours..." : "Confirmer et activer mon compte"}</span>
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier mes infos</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : "Renvoyer le code"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

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
