import { canUseCustomDomain, type PlanValue } from "@/lib/plan-config";
import { parseSingleTenantHosts } from "@/lib/single-tenant";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const SINGLE_TENANT_HOSTS = parseSingleTenantHosts(process.env.SINGLE_TENANT_HOSTS);

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".test");
}

/** Origen público del catálogo: dominio propio (solo si el plan lo habilita) o subdominio. */
export function getTenantOrigin(tenant: { slug: string; customDomain: string | null; plan: PlanValue }): string {
  // Sin dominio propio de la plataforma: la agencia vive en la dirección configurada en SINGLE_TENANT_HOSTS.
  if (!(tenant.customDomain && canUseCustomDomain(tenant.plan))) {
    for (const [host, slug] of SINGLE_TENANT_HOSTS) {
      if (slug === tenant.slug) return `${isLocalHost(host) ? "http" : "https"}://${host}`;
    }
  }
  const host =
    tenant.customDomain && canUseCustomDomain(tenant.plan) ? tenant.customDomain : `${tenant.slug}.${ROOT_DOMAIN}`;
  return `${isLocalHost(host) ? "http" : "https"}://${host}`;
}

const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_SUBDOMAIN ?? "app";

/** Origen del panel (app.tudominio.com): se usa para armar links en emails. */
export function getAppOrigin(): string {
  // Con una sola dirección (sin subdominio app.), se indica el origen completo del panel.
  const override = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (override) return override.replace(/\/+$/, "");
  const host = `${APP_SUBDOMAIN}.${ROOT_DOMAIN}`;
  return `${isLocalHost(host) ? "http" : "https"}://${host}`;
}
