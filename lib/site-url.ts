import { canUseCustomDomain, type PlanValue } from "@/lib/plan-config";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".test");
}

/** Origen público del catálogo: dominio propio (solo si el plan lo habilita) o subdominio. */
export function getTenantOrigin(tenant: { slug: string; customDomain: string | null; plan: PlanValue }): string {
  const host =
    tenant.customDomain && canUseCustomDomain(tenant.plan) ? tenant.customDomain : `${tenant.slug}.${ROOT_DOMAIN}`;
  return `${isLocalHost(host) ? "http" : "https"}://${host}`;
}

const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_SUBDOMAIN ?? "app";

/** Origen del panel (app.tudominio.com): se usa para armar links en emails. */
export function getAppOrigin(): string {
  const host = `${APP_SUBDOMAIN}.${ROOT_DOMAIN}`;
  return `${isLocalHost(host) ? "http" : "https"}://${host}`;
}
