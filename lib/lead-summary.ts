import "server-only";
import type { TenantDb } from "@/lib/db";
import type { LeadSummary } from "@/lib/lead-types";

/** Resumen liviano para el aviso en el panel: leads nuevos, seguimientos vencidos y el último que entró. */
export async function getLeadSummary(db: TenantDb): Promise<LeadSummary> {
  const [newCount, overdueCount, latest] = await Promise.all([
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.count({
      where: { status: { in: ["CONTACTED", "VISIT_SCHEDULED", "NEGOTIATING"] }, nextFollowUp: { lt: new Date() } },
    }),
    db.lead.findFirst({
      where: { status: "NEW" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientName: true,
        createdAt: true,
        vehicle: { select: { brand: true, model: true, year: true } },
      },
    }),
  ]);

  return {
    newCount,
    overdueCount,
    latest: latest
      ? {
          id: latest.id,
          clientName: latest.clientName,
          vehicleLabel: latest.vehicle ? `${latest.vehicle.brand} ${latest.vehicle.model} ${latest.vehicle.year}` : null,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
  };
}
