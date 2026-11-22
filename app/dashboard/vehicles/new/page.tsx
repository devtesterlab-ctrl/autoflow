import { randomUUID } from "node:crypto";
import { PlanBanner } from "@/components/dashboard/PlanBanner";
import { VehicleForm } from "@/components/dashboard/VehicleForm";
import { getPlanUsage } from "@/lib/plan-limits";
import { requireTenant } from "@/lib/session";

export default async function NewVehiclePage() {
  const { db, tenant } = await requireTenant();
  const usage = await getPlanUsage(db, tenant.id, tenant.plan);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Nuevo auto</h1>
      <PlanBanner usage={usage} agencyName={tenant.name} />
      <VehicleForm
        mode="create"
        vehicleId={randomUUID()}
        defaultStatus={usage.atVehicleLimit ? "PREPARATION" : "AVAILABLE"}
      />
    </main>
  );
}
