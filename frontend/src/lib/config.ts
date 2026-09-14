/**
 * Configuration globale dynamique de l'application SaaS.
 * Toutes les variables de domaine sont lues depuis le .env.
 */

export const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_BASE_DOMAIN ||
  (typeof window !== "undefined" && window.location.hostname.split(".").length > 2
    ? window.location.hostname.split(".").slice(1).join(".")
    : "tikzone.net");


export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || `https://api.${BASE_DOMAIN}`;

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || `https://app.${BASE_DOMAIN}`;

export const VPN_HOST =
  process.env.NEXT_PUBLIC_VPN_HOST || `vpn.${BASE_DOMAIN}`;
