import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { domainTag } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { CUSTOM_DOMAIN_PLANS } from "@/lib/plan-config";

/** Solo campos públicos y serializables: el resultado pasa por la caché de datos de Next. */
const publicTenantSelect = {
  id: true,
  name: true,
  slug: true,
  customDomain: true,
  logoUrl: true,
  primaryColor: true,
  whatsappNumber: true,
  address: true,
  city: true,
  instagramHandle: true,
  plan: true,
} satisfies Prisma.TenantSelect;

export type PublicTenant = Prisma.TenantGetPayload<{ select: typeof publicTenantSelect }>;

function normalizeDomain(raw: string): string | null {
  try {
    const domain = decodeURIComponent(raw).trim().toLowerCase();
    return domain && domain.length <= 253 ? domain : null;
  } catch {
    return null;
  }
}

/**
 * Resuelve una agencia por el segmento `[domain]` que arma el middleware (slug o dominio propio).
 * El dominio propio solo resuelve si el plan lo habilita. Cacheado por dominio y se invalida con
 * `invalidateTenantCatalog` (cambios de branding, slug, plan o estado de la agencia).
 */
export const getTenantByDomain = cache(async (rawDomain: string): Promise<PublicTenant | null> => {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return null;

  return unstable_cache(
    () =>
      prisma.tenant.findFirst({
        where: {
          isActive: true,
          OR: [{ slug: domain }, { customDomain: domain, plan: { in: CUSTOM_DOMAIN_PLANS } }],
        },
        select: publicTenantSelect,
      }),
    ["tenant-by-domain", domain],
    { tags: [domainTag(domain)], revalidate: 3600 },
  )();
});
