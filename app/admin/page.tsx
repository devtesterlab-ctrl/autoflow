import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ACTIVE_VEHICLE_STATUSES, PLAN_LIMITS, type PlanValue } from "@/lib/plan-config";

const PLANS: PlanValue[] = ["FREE", "STARTER", "PRO"];
const DAY = 86_400_000;
const WEEKS = 8;

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });
const shortDateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

const INPUT_CLASS = "h-11 w-full border-2 border-black bg-white px-3 text-base dark:border-white dark:bg-neutral-950";

type SearchParams = { q?: string; plan?: string; status?: string; limit?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const plan = PLANS.find((value) => value === params.plan);
  const status = params.status === "active" || params.status === "suspended" ? params.status : undefined;
  const onlyAtLimit = params.limit === "1";

  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const sinceWeeks = new Date(now - WEEKS * 7 * DAY);

  const filters: Prisma.TenantWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { users: { some: { email: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (plan) filters.push({ plan });
  if (status) filters.push({ isActive: status === "active" });

  // Lectura entre agencias a propósito: este panel es solo para administradores de la plataforma.
  const [rows, planGroups, activeCount, suspendedCount, signups7, leads30, signupDates, auditLogs] = await Promise.all([
    prisma.tenant.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        customDomain: true,
        onboardingCompleted: true,
        createdAt: true,
        users: { where: { role: "OWNER" }, take: 1, select: { email: true } },
        _count: {
          select: {
            users: true,
            vehicles: { where: { status: { in: [...ACTIVE_VEHICLE_STATUSES] } } },
            leads: { where: { createdAt: { gte: since30 } } },
          },
        },
      },
    }),
    prisma.tenant.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count({ where: { isActive: false } }),
    prisma.tenant.count({ where: { createdAt: { gte: since7 } } }),
    prisma.lead.count({ where: { createdAt: { gte: since30 } } }),
    prisma.tenant.findMany({ where: { createdAt: { gte: sinceWeeks } }, select: { createdAt: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const tenants = rows
    .map((row) => {
      const limit = PLAN_LIMITS[row.plan].maxActiveVehicles;
      return { ...row, activeVehicles: row._count.vehicles, limit, atLimit: row._count.vehicles >= limit };
    })
    .filter((row) => !onlyAtLimit || row.atLimit);

  const weekly = Array.from({ length: WEEKS }, (_, index) => {
    const end = now - index * 7 * DAY;
    const start = end - 7 * DAY;
    const count = signupDates.filter((item) => item.createdAt.getTime() > start && item.createdAt.getTime() <= end).length;
    return { label: shortDateFormatter.format(new Date(start)), count };
  }).reverse();
  const maxWeekly = Math.max(1, ...weekly.map((week) => week.count));
  const planCounts = Object.fromEntries(planGroups.map((group) => [group.plan, group._count._all])) as Record<string, number>;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Agencias</h1>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Activas", value: activeCount },
          { label: "Suspendidas", value: suspendedCount },
          { label: "Altas (7 días)", value: signups7 },
          { label: "Leads (30 días)", value: leads30 },
        ].map((kpi) => (
          <div key={kpi.label} className="border-2 border-black p-4 dark:border-white">
            <p className="text-4xl font-black">{kpi.value}</p>
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">{kpi.label}</p>
          </div>
        ))}
      </section>

      <section aria-label="Planes y altas" className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 border-2 border-black p-4 dark:border-white">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Agencias por plan</h2>
          <ul className="space-y-2">
            {PLANS.map((value) => (
              <li key={value} className="flex items-center justify-between border-b-2 border-black/10 pb-2 dark:border-white/10">
                <span className="font-bold">{PLAN_LIMITS[value].label}</span>
                <span className="text-xl font-black">{planCounts[value] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 border-2 border-black p-4 dark:border-white">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Altas por semana</h2>
          <ul className="space-y-1.5">
            {weekly.map((week) => (
              <li key={week.label} className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 font-semibold text-neutral-600 dark:text-neutral-400">{week.label}</span>
                <span className="h-4 flex-1 bg-neutral-200 dark:bg-neutral-800">
                  <span className="block h-full bg-black dark:bg-white" style={{ width: `${(week.count / maxWeekly) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-black">{week.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <form method="get" className="grid gap-3 border-2 border-black p-4 sm:grid-cols-[1fr_auto_auto_auto_auto] dark:border-white">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, subdominio o email" className={INPUT_CLASS} aria-label="Buscar" />
        <select name="plan" defaultValue={plan ?? ""} className={INPUT_CLASS} aria-label="Plan">
          <option value="">Todos los planes</option>
          {PLANS.map((value) => (
            <option key={value} value={value}>
              {PLAN_LIMITS[value].label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className={INPUT_CLASS} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="suspended">Suspendidas</option>
        </select>
        <label className="flex h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="limit" value="1" defaultChecked={onlyAtLimit} className="h-5 w-5" />
          Al límite
        </label>
        <button type="submit" className="h-11 border-2 border-black bg-black px-5 font-bold text-white dark:border-white dark:bg-white dark:text-black">
          Filtrar
        </button>
      </form>

      <section aria-label="Listado de agencias" className="space-y-3">
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {tenants.length} {tenants.length === 1 ? "agencia" : "agencias"}
          {rows.length === 200 ? " (se muestran las 200 más recientes)" : ""}
        </p>

        {tenants.length === 0 ? (
          <p className="border-2 border-dashed border-black/40 p-8 text-center font-semibold dark:border-white/40">No hay agencias con esos filtros.</p>
        ) : (
          <ul className="space-y-3">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <Link
                  href={`/admin/agencias/${tenant.id}`}
                  className="grid gap-3 border-2 border-black p-4 hover:bg-neutral-50 sm:grid-cols-[2fr_1fr_1fr_1fr] dark:border-white dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-extrabold">{tenant.name}</p>
                    <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                      {tenant.slug} · {tenant.users[0]?.email ?? "sin dueño"}
                    </p>
                    <p className="text-xs text-neutral-500">Alta {dateFormatter.format(tenant.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap content-start items-start gap-2 text-xs font-black">
                    <span className="border-2 border-black px-2 py-0.5 dark:border-white">{PLAN_LIMITS[tenant.plan].label.toUpperCase()}</span>
                    {!tenant.isActive ? <span className="bg-red-600 px-2 py-1 text-white">SUSPENDIDA</span> : null}
                    {!tenant.onboardingCompleted ? <span className="bg-amber-400 px-2 py-1 text-black">SIN CONFIGURAR</span> : null}
                    {tenant.atLimit ? <span className="bg-black px-2 py-1 text-white dark:bg-white dark:text-black">AL LÍMITE</span> : null}
                  </div>
                  <div className="text-sm">
                    <p className="font-black">
                      {tenant.activeVehicles} / {tenant.limit}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">autos activos</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-black">{tenant._count.leads}</p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      leads (30 d) · {tenant._count.users} {tenant._count.users === 1 ? "usuario" : "usuarios"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Registro de cambios" className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Últimos cambios</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Todavía no hay cambios registrados.</p>
        ) : (
          <ul className="space-y-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="border-2 border-black/20 p-3 text-sm dark:border-white/20">
                <p className="font-bold">
                  {log.tenantName ?? "—"} · {log.action}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {log.detail} · {log.adminEmail} · {dateTimeFormatter.format(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
