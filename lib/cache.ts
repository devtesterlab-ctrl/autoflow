import { revalidatePath, revalidateTag } from "next/cache";

/** Tag de todo el contenido público de una agencia (listado, fichas). */
export const tenantTag = (tenantId: string) => `tenant:${tenantId}`;

/** Tag de la resolución dominio -> agencia (branding, plan, dominio propio). */
export const domainTag = (domain: string) => `domain:${domain.toLowerCase()}`;

interface CacheTenant {
  id: string;
  slug: string;
  customDomain: string | null;
}

/**
 * Único punto de invalidación del catálogo público. Se llama cuando la agencia edita un auto,
 * cambia su estado, o cambia su branding/slug/plan.
 *
 * Next 15: revalidateTag(tag). En Next 16 la firma pide un perfil: revalidateTag(tag, "max")
 * o updateTag(tag) dentro de Server Actions. Si migrás, solo se cambia este archivo.
 */
export function invalidateTenantCatalog(
  tenant: CacheTenant,
  previous?: { slug?: string | null; customDomain?: string | null },
): void {
  const domains = new Set<string>([tenant.slug]);
  if (tenant.customDomain) domains.add(tenant.customDomain);
  if (previous?.slug) domains.add(previous.slug);
  if (previous?.customDomain) domains.add(previous.customDomain);

  revalidateTag(tenantTag(tenant.id));
  for (const domain of domains) {
    revalidateTag(domainTag(domain));
    revalidatePath(`/sites/${domain}`, "layout");
  }
}

/** Etiqueta del resultado guardado del tablero de estado del administrador. */
export const SYSTEM_STATUS_TAG = "system-status";

export function invalidateSystemStatus(): void {
  revalidateTag(SYSTEM_STATUS_TAG);
}
