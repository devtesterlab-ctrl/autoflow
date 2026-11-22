import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Instancia liviana (sin Prisma) para poder correr en el Edge Runtime.
const { auth } = NextAuth(authConfig);

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
const APP_SUBDOMAIN = (process.env.NEXT_PUBLIC_APP_SUBDOMAIN ?? "app").toLowerCase();
const RESERVED_SUBDOMAINS = new Set([APP_SUBDOMAIN, "www", "api", "admin"]);
const PUBLIC_ROOT_FILES = new Set(["/robots.txt", "/sitemap.xml"]);

type HostKind =
  | { type: "root" }
  | { type: "app" }
  | { type: "tenant"; domain: string };

function classifyHost(rawHost: string): HostKind {
  const hostname = rawHost.toLowerCase().split(":")[0];
  const root = ROOT_DOMAIN.split(":")[0];

  if (hostname === root || hostname === `www.${root}` || hostname === "127.0.0.1") {
    return { type: "root" };
  }
  if (hostname === `${APP_SUBDOMAIN}.${root}`) {
    return { type: "app" };
  }
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    if (!sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
      return { type: "tenant", domain: sub };
    }
    return { type: "root" };
  }
  // Despliegues de vista previa de Vercel (*.vercel.app): se tratan como el panel, no como una agencia.
  if (hostname.endsWith(".vercel.app")) return { type: "app" };
  // Cualquier otro host se interpreta como dominio personalizado.
  // La existencia real del dominio se valida contra la base en /sites/[domain].
  return { type: "tenant", domain: hostname };
}

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const host = req.headers.get("host") ?? nextUrl.host;
  const kind = classifyHost(host);

  // Nunca confiar en un x-tenant-id enviado por el cliente.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-tenant-id");

  // /sites es una ruta interna: no se accede directo desde afuera.
  if (path === "/sites" || path.startsWith("/sites/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // --- Catálogo público (subdominio o dominio propio) ---
  if (kind.type === "tenant") {
    const isAsset = /\.[a-z0-9]+$/i.test(path) && !PUBLIC_ROOT_FILES.has(path);
    if (isAsset) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    const url = nextUrl.clone();
    url.pathname = `/sites/${kind.domain}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // --- Panel / app ---
  const tenantId = req.auth?.user?.tenantId;
  const isLoggedIn = Boolean(tenantId);
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/onboarding") || path.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", `${path}${nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if ((path === "/login" || path === "/register") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (kind.type === "app" && path === "/") {
    return NextResponse.redirect(new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl));
  }

  if (isProtected && tenantId) {
    // Solo informativo (logs, trazas). La autoridad real es la sesión en el servidor.
    requestHeaders.set("x-tenant-id", tenantId);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: ["/((?!api/|_next/|_vercel/|favicon.ico).*)"],
};
