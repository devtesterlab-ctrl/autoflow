import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TenantAdminActions } from "@/components/admin/TenantAdminActions";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { isActiveStatus, PLAN_LIMITS } from "@/lib/plan-config";
import { getTenantOrigin } from "@/lib/site-url";
import { STATUS_LABELS } from "@/lib/vehicle-ui";
import type { StatusValue } from "@/lib/validators/vehicle";

const DAY = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default async function AdminTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;

  // Lectura entre agencias a propósito (solo administradores de la plataforma).
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!tenant) notFound();

  const since30 = new Date(Date.now() - 30 * DAY);
  const [vehicleGroups, leads30, leadsTotal, lastLead, logs] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["status"], where: { tenantId: id }, _count: { _all: true } }),
    prisma.lead.count({ where: { tenantId: id, createdAt: { gte: since30 } } }),
    prisma.lead.count({ where: { tenantId: id } }),
    prisma.lead.findFirst({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.adminAuditLog.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const limits = PLAN_LIMITS[tenant.plan];
  const activeVehicles = vehicleGroups
    .filter((group) => isActiveStatus(group.status))
    .reduce((total, group) => total + group._count._all, 0);
  const publicUrl = getTenantOrigin(tenant);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link href="/admin" className="inline-flex h-11 items-center gap-2 text-sm font-bold underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">{tenant.name}</h1>
          <span className="border-2 border-black px-2 py-0.5 text-xs font-black dark:border-white">{limits.label.toUpperCase()}</span>
          {!tenant.isActive ? <span className="bg-red-600 px-2 py-1 text-xs font-black text-white">SUSPENDIDA</span> : null}
          {!tenant.onboardingCompleted ? <span className="bg-amber-400 px-2 py-1 text-xs font-black text-black">SIN CONFIGURAR</span> : null}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Alta {dateFormatter.format(tenant.createdAt)} ·{" "}
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
            {publicUrl.replace(/^https?:\/\//, "")}
          </a>
          {tenant.customDomain ? ` · dominio propio: ${tenant.customDomain}` : ""}
        </p>
      </header>

      <section aria-label="Uso" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Autos activos", value: `${activeVehicles} / ${limits.maxActiveVehicles}` },
          { label: "Usuarios", value: `${tenant.users.length} / ${limits.maxUsers}` },
          { label: "Leads (30 días)", value: String(leads30) },
          { label: "Leads totales", value: String(leadsTotal) },
        ].map((item) => (
          <div key={item.label} className="border-2 border-black p-4 dark:border-white">
            <p className="text-3xl font-black">{item.value}</p>
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">{item.label}</p>
          </div>
        ))}
      </section>

      <section aria-label="Inventario" className="space-y-2 border-2 border-black p-4 dark:border-white">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Inventario por estado</h2>
        <ul className="flex flex-wrap gap-2 text-sm font-bold">
          {vehicleGroups.length === 0 ? <li className="text-neutral-600 dark:text-neutral-400">Sin autos cargados.</li> : null}
          {vehicleGroups.map((group) => (
            <li key={group.status} className="border-2 border-black/30 px-3 py-1 dark:border-white/30">
              {STATUS_LABELS[group.status as StatusValue]}: {group._count._all}
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Último lead: {lastLead ? dateTimeFormatter.format(lastLead.createdAt) : "todavía ninguno"}
        </p>
      </section>

      <TenantAdminActions
        tenantId={tenant.id}
        plan={tenant.plan}
        isActive={tenant.isActive}
        customDomain={tenant.customDomain}
        isSelf={tenant.id === admin.tenantId}
      />

      <section aria-label="Usuarios" className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Usuarios</h2>
        <ul className="space-y-2">
          {tenant.users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 border-2 border-black/20 p-3 dark:border-white/20">
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
              </div>
              <span className="text-xs font-black">{user.role === "OWNER" ? "DUEÑO" : "VENDEDOR"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Registro de cambios" className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Registro de cambios</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Sin cambios registrados.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="border-2 border-black/20 p-3 text-sm dark:border-white/20">
                <p className="font-bold">{log.action}</p>
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
