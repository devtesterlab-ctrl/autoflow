import { signOut } from "@/auth";
import { requireTenant } from "@/lib/session";

export default async function DashboardPage() {
  const { tenant, user, db } = await requireTenant();

  const [vehicles, leads] = await Promise.all([db.vehicle.count(), db.lead.count()]);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          {tenant.name} · {tenant.plan}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight font-display">Hola, {user.name ?? user.email}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Rol: {user.role} · tenantId: <code>{tenant.id}</code>
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="border border-neutral-200 p-5 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.04]">
          <p className="text-4xl font-semibold font-display">{vehicles}</p>
          <p className="text-sm font-medium">Vehículos</p>
        </div>
        <div className="border border-neutral-200 p-5 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.04]">
          <p className="text-4xl font-semibold font-display">{leads}</p>
          <p className="text-sm font-medium">Leads</p>
        </div>
      </section>

      <form action={logout}>
        <button className="h-12 border border-neutral-300 px-6 font-semibold dark:border-white/20 rounded-xl bg-white dark:bg-white/5">Cerrar sesión</button>
      </form>
    </main>
  );
}
