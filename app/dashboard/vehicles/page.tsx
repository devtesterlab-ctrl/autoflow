import { PlanBanner } from "@/components/dashboard/PlanBanner";
import { VehicleInventory, type InventoryVehicle } from "@/components/dashboard/VehicleInventory";
import { getPlanUsage } from "@/lib/plan-limits";
import { requireTenant } from "@/lib/session";

export default async function VehiclesPage() {
  const { db, tenant } = await requireTenant();

  const [rows, usage] = await Promise.all([
    db.vehicle.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        brand: true,
        model: true,
        version: true,
        year: true,
        mileage: true,
        price: true,
        currency: true,
        transmission: true,
        fuelType: true,
        status: true,
        isFeatured: true,
        images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1, select: { url: true } },
      },
    }),
    getPlanUsage(db, tenant.id, tenant.plan),
  ]);

  const vehicles: InventoryVehicle[] = rows.map((row) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    version: row.version,
    year: row.year,
    mileage: row.mileage,
    price: Number(row.price),
    currency: row.currency,
    transmission: row.transmission,
    fuelType: row.fuelType,
    status: row.status,
    isFeatured: row.isFeatured,
    coverUrl: row.images[0]?.url ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight font-display">Inventario</h1>
      <PlanBanner usage={usage} agencyName={tenant.name} />
      <VehicleInventory
        vehicles={vehicles}
        branding={{
          name: tenant.name,
          primaryColor: tenant.primaryColor,
          hasLogo: Boolean(tenant.logoUrl),
          whatsappNumber: tenant.whatsappNumber,
          instagramHandle: tenant.instagramHandle,
          city: tenant.city,
        }}
      />
    </main>
  );
}
