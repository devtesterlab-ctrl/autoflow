import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { getPublicVehicles } from "@/lib/public-vehicle";
import { getTenantByDomain } from "@/lib/tenant";

/**
 * No lee searchParams ni headers: el filtrado ocurre en el cliente sobre la lista completa,
 * así la página puede cachearse y servirse estática hasta que la agencia edite algo.
 */
export default async function SiteHomePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) notFound();

  const vehicles = await getPublicVehicles(tenant.id);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Vehículos disponibles
          </h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-400">
            {tenant.city ? `Unidades seleccionadas en ${tenant.city}. ` : ""}Consultá directamente por WhatsApp.
          </p>
        </div>
      </header>
      <CatalogBrowser vehicles={vehicles} />
    </main>
  );
}
