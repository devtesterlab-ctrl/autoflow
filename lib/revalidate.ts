import { revalidatePath } from "next/cache";
import { invalidateTenantCatalog } from "@/lib/cache";

/** Cambios de inventario: refresca el panel y regenera el catálogo público de la agencia. */
export function revalidateCatalog(tenant: { id: string; slug: string; customDomain: string | null }): void {
  revalidatePath("/dashboard/vehicles");
  invalidateTenantCatalog(tenant);
}
