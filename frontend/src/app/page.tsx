"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { formatFCFA } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Layers,
  Printer,
  Router as RouterIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">TikZone</span>
                <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {appVersion}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Fonctionnalités</a>
              <a href="#comparison" className="hover:text-blue-600 transition-colors">Pourquoi TikZone ?</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors">Tarifs</a>
              <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
            </div>

            {/* Right Controls: Lang + Theme + Auth */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center">
                <LangToggle />
              </div>
              <ThemeToggle />

              <Link
                href="/login"
                className="hidden sm:inline-flex px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 shrink-0"
              >
                Démarrer
              </Link>
            </div>
          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Architecture 100% Cloud Hotspot • Zéro usure de mémoire MikroTik</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight max-w-4xl mx-auto leading-[1.12]">
            La puissance du <span className="text-blue-600">Cloud</span> pour vos Hotspots MikroTik.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Fini la mémoire Flash saturée et les scripts bloqués. TikZone centralise vos <strong>tickets, forfaits, sessions actives et chiffres d'affaires</strong> dans notre base Cloud. Même si vous formatez, réinitialisez ou remplacez votre MikroTik, <strong>aucune donnée n'est perdue</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Créer mon compte Cloud</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#comparison"
              className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm sm:text-base rounded-2xl transition-all shadow-xs"
            >
              Découvrir les avantages du Cloud
            </a>
          </div>

          {/* KPI Mini Bar */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl font-black text-emerald-600">&lt; 30 ms</div>
              <div className="text-xs text-slate-500 mt-0.5">Validation des tickets</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl font-black text-blue-600">0% CPU</div>
              <div className="text-xs text-slate-500 mt-0.5">Soulage votre MikroTik</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl font-black text-indigo-600">1 000+</div>
              <div className="text-xs text-slate-500 mt-0.5">Tickets émis en 1 seconde</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl font-black text-slate-900">100% FCFA</div>
              <div className="text-xs text-slate-500 mt-0.5">Comptabilité exacte en base</div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Local Storage vs Cloud Native */}
      <section id="comparison" className="py-16 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Révolution Cloud Hotspot
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Pourquoi abandonner le stockage local sur MikroTik ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Stocker des milliers de tickets directement dans la mémoire flash d'un MikroTik ralentit l'appareil, provoque des blocages lors des mises à jour et fausse votre comptabilité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Legacy Local Mode */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Ancien Mode Local (Sur MikroTik)</h3>
                  <p className="text-xs text-rose-600">Vulnérable et limité</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Saturation de la mémoire Flash</strong> : Les MikroTik d'entrée de gamme (hAP lite, hEX) plantent quand ils ont trop d'utilisateurs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Bugs d'adresses MAC aléatoires</strong> : Les iPhones (iOS) et smartphones Android récents changent d'adresse MAC privée, provoquant déconnexions et tickets bloqués.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Perte de l'historique de ventes</strong> : En cas de coupure de courant, de reboot ou de reset, tous les tickets et compteurs peuvent être effacés.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Pas de roaming multi-bornes</strong> : Un ticket créé sur une borne ne fonctionne pas sur vos autres antennes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Génération lente</strong> : Créer 200 tickets fige le processeur du routeur pendant de longues secondes.</span>
                </li>
              </ul>
            </div>

            {/* TikZone Cloud Engine */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/80 border-2 border-emerald-500/50 shadow-md space-y-4 relative">
              <div className="absolute top-4 right-4 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full">
                ARCHITECTURE MODERNE
              </div>
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="p-2.5 rounded-2xl bg-emerald-100/70 border border-emerald-200">
                  <ShieldCheck className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">TikZone 100% Cloud Native</h3>
                  <p className="text-xs text-emerald-700">Centralisé, Sécurisé & Évolutif</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zéro charge sur le MikroTik</strong> : Les tickets et forfaits sont stockés dans notre base cloud sécurisée. Votre routeur ne sert que de passerelle d'accès.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Compatible Adresses MAC Privées (iOS & Android)</strong> : Zéro déconnexion intempestive. Même si le smartphone change d'adresse MAC aléatoire, le forfait reste valide sans rejet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Insensible au formatage & pannes</strong> : Votre MikroTik peut être réinitialisé à zéro, formaté ou remplacé par un neuf : <strong>vous ne perdez rien</strong>. Toutes vos données restent protégées dans notre base.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Comptabilité FCFA infaillible</strong> : Suivez votre CA journalier, mensuel et téléchargez vos rapports financiers PDF vectoriels basés sur les ventes réelles.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Multi-Antennes & Roaming instantané</strong> : Vos clients utilisent le même ticket sur toutes vos bornes Wi-Fi sans aucune reconnexion manuelle.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Raccordement 1-Clic</strong> : Une seule ligne de commande dans votre New Terminal suffit pour reconnecter votre matériel à tout moment.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Fonctionnalités</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Tout pour gérer votre activité WiFi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Vouchers & Impression PDF</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Générez des planches de coupons en 1 clic avec des formats adaptés pour imprimantes thermiques (80mm/58mm) ou A4.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Consommation de Données</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Suivez en temps réel les débits, les utilisateurs connectés et le volume d'octets transférés pour chaque client.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Multi-Espaces Techniciens</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gérez facilement des dizaines de clients différents grâce à des sous-domaines séparés pour chaque site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Tarifs</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Une tarification claire et sans engagement
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {/* Espace */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Espace en Ligne</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">1 000 CFA</span>
                  <span className="text-xs text-slate-500">/ unique</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Sous-domaine dédié avec accès permanent 24/7.</p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sous-domaine personnalisé</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Validité illimitée sans expiration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Rattachez autant de routeurs que vous voulez</span>
                </li>
              </ul>

              <Link
                href="/register"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Créer un Espace</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Routeur */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-blue-500 shadow-md space-y-5 relative">
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full">
                POPULAIRE
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Routeur Connecté VPN</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">500 CFA</span>
                  <span className="text-xs text-slate-500">/ mois</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Tunnel VPN + Ports Winbox et API dédiés.</p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Port API dédié (41xxx)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Port Winbox distant dédié (51xxx)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Script MikroTik prêt à coller</span>
                </li>
              </ul>

              <Link
                href="/register"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Ajouter un Routeur</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Questions Fréquentes</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Tout ce que vous devez savoir sur TikZone
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Des réponses claires pour vous aider à démarrer sereinement.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Qu'est-ce que TikZone et pourquoi remplace-t-il l'ancienne version ?",
                a: "TikZone est une plateforme cloud nouvelle génération conçue spécifiquement pour RouterOS 7 (7.10 à 7.21+). Contrairement à l'ancien système PHP qui plante lors des mises à jour récentes de MikroTik (scripts bloqués, erreurs de calculs de rapports), TikZone offre une connexion 100% stable, un tunnel VPN sécurisé et une interface rapide pensée pour smartphone.",
              },
              {
                q: "Ai-je besoin d'une adresse IP publique fixe pour mon routeur ?",
                a: "Non, absolument pas ! Le routeur initie lui-même la connexion sortante vers notre serveur VPN. Vous pouvez utiliser n'importe quelle connexion 4G/LTE (Orange, Moov, MTN, Telecel), fibre grand public ou Starlink, même située derrière un réseau CGNAT ou sans adresse IP fixe.",
              },
              {
                q: "Puis-je gérer plusieurs routeurs ou les comptes de plusieurs clients ?",
                a: "Oui ! Si vous êtes propriétaire, vous pouvez ajouter tous vos routeurs sur votre espace. Si vous êtes technicien ou installateur, vous pouvez créer des espaces indépendants pour chacun de vos clients (avec des sous-domaines séparés) et les administrer facilement.",
              },
              {
                q: "Comment fonctionne le rechargement du solde et les paiements ?",
                a: "Vous rechargez votre portefeuille en Francs CFA par Mobile Money (Orange Money, Wave, Moov Money) ou Carte Bancaire selon votre pays (Mali, Sénégal, Côte d'Ivoire, Burkina Faso, Niger, Bénin, Togo). Les frais sont automatiquement déduits pour vos espaces (1 000 CFA à vie) et vos abonnements routeurs (500 CFA/mois).",
              },
              {
                q: "Comment imprimer mes coupons / tickets sur une imprimante thermique ?",
                a: "TikZone intègre un moteur d'export haute fidélité qui génère des tickets au format idéal pour imprimantes thermiques de caisse (80mm ou 58mm) ainsi que sur feuilles A4 pour impression standard.",
              },
              {
                q: "Que se passe-t-il si mon abonnement mensuel de routeur arrive à expiration ?",
                a: "Si l'option de renouvellement automatique est cochée et que votre solde est suffisant, votre routeur est renouvelé sans interruption. Si le solde est insuffisant, le tunnel VPN est temporairement mis en pause jusqu'à votre prochaine recharge, sans aucune perte de vos données ou de vos profils.",
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all open:shadow-xs"
              >
                <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer select-none">
                  <span>{faq.q}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0 ml-2" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-200 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900">TikZone Cloud SaaS</span>
            <span>• {appVersion} • © 2026 Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27assistance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-bold hover:underline"
            >
              Support WhatsApp : +223 99 28 18 99
            </a>
            <Link href="/login" className="hover:text-blue-600 transition-colors">Connexion</Link>
            <Link href="/register" className="hover:text-blue-600 transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
