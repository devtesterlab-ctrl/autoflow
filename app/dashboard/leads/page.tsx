import { LeadsBoard } from "@/components/dashboard/LeadsBoard";
import { leadSelect, toLeadDTO } from "@/lib/lead-dto";
import type { VehicleOption } from "@/lib/lead-types";
import { requireTenant } from "@/lib/session";
import { STATUS_LABELS } from "@/lib/vehicle-ui";

export default async function LeadsPage() {
  const { db, tenant } = await requireTenant();

  const [leadRows, vehicleRows] = await Promise.all([
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: leadSelect }),
    db.vehicle.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: { id: true, brand: true, model: true, version: true, year: true, status: true },
    }),
  ]);

  const vehicles: VehicleOption[] = vehicleRows.map((vehicle) => ({
    id: vehicle.id,
    label: `${[vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ")} ${vehicle.year}${
      vehicle.status === "SOLD" || vehicle.status === "PREPARATION" ? ` (${STATUS_LABELS[vehicle.status]})` : ""
    }`,
  }));

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <LeadsBoard leads={leadRows.map(toLeadDTO)} vehicles={vehicles} tenantName={tenant.name} />
    </main>
  );
}
