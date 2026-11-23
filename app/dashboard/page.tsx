import { signOut } from "@/auth";
import { ShareCatalog } from "@/components/dashboard/ShareCatalog";
import { requireTenant } from "@/lib/session";
import { getTenantOrigin } from "@/lib/site-url";

export default async function DashboardPage() {
  const { tenant, user, db } = await requireTenant();

  const [vehicles, leads] = await Promise.all([db.vehicle.count(), db.lead.count()]);

  const origin = getTenantOrigin(tenant);
  const configured = !/localhost/.test(origin);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          {tenant.name} · {tenant.plan}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Hola, {user.name ?? user.email}</h1>
      </header>

      <ShareCatalog url={origin} agencyName={tenant.name} configured={configured} />

      <section className="grid grid-cols-2 gap-4" aria-label="Resumen">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="font-display text-4xl font-semibold">{vehicles}</p>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Vehículos</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="font-display text-4xl font-semibold">{leads}</p>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Leads</p>
        </div>
      </section>

      <form action={logout}>
        <button className="h-12 rounded-xl border border-neutral-300 bg-white px-6 text-sm font-semibold dark:border-white/20 dark:bg-white/5">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
