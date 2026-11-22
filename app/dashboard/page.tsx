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
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          {tenant.name} · {tenant.plan}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Hola, {user.name ?? user.email}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Rol: {user.role} · tenantId: <code>{tenant.id}</code>
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="border-2 border-black p-5 dark:border-white">
          <p className="text-4xl font-extrabold">{vehicles}</p>
          <p className="text-sm font-semibold">Vehículos</p>
        </div>
        <div className="border-2 border-black p-5 dark:border-white">
          <p className="text-4xl font-extrabold">{leads}</p>
          <p className="text-sm font-semibold">Leads</p>
        </div>
      </section>

      <form action={logout}>
        <button className="h-12 border-2 border-black px-6 font-bold dark:border-white">Cerrar sesión</button>
      </form>
    </main>
  );
}
