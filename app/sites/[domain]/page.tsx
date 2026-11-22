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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Autos usados</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {tenant.city ? `${tenant.city} · ` : ""}Consultá por WhatsApp, respondemos al instante.
        </p>
      </header>
      <CatalogBrowser vehicles={vehicles} />
    </main>
  );
}
