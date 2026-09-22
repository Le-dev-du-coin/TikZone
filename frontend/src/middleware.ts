import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "webmail",
  "cpanel",
  "static",
  "cdn",
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Ignorer les requêtes internes Next.js, API directes et assets statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Extraction du sous-domaine
  // Exemples : "lousain.tikzone.net" -> "lousain", "lousain.localhost:3000" -> "lousain"
  const cleanHost = host.split(":")[0].toLowerCase();
  let subdomain = "";

  if (cleanHost.endsWith("tikzone.net")) {
    const parts = cleanHost.replace(".tikzone.net", "").split(".");
    if (parts.length > 0 && parts[0]) {
      subdomain = parts[0];
    }
  } else if (cleanHost.includes("localhost")) {
    const parts = cleanHost.split(".");
    if (parts.length > 1 && parts[0] !== "localhost") {
      subdomain = parts[0];
    }
  }

  // Si on est sur un sous-domaine client valide (non réservé)
  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    // Si l'utilisateur arrive sur la racine "/" de son sous-domaine, le diriger vers son login pré-rempli
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("user", subdomain);
      return NextResponse.redirect(url);
    }

    // Ajouter l'en-tête x-subdomain pour traçabilité côté serveur
    const response = NextResponse.next();
    response.headers.set("x-subdomain", subdomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
