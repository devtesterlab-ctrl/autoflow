import { notFound } from "next/navigation";
import { VehicleForm, type VehicleFormInitial } from "@/components/dashboard/VehicleForm";
import { requireTenant } from "@/lib/session";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();

  // tenantDb filtra por tenantId: un id de otra agencia devuelve null -> 404.
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!vehicle) notFound();

  const initial: VehicleFormInitial = {
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version ?? "",
    year: vehicle.year,
    mileage: vehicle.mileage,
    price: Number(vehicle.price),
    currency: vehicle.currency,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    color: vehicle.color ?? "",
    description: vehicle.description ?? "",
    features: vehicle.features,
    status: vehicle.status,
    isFeatured: vehicle.isFeatured,
    images: vehicle.images.map((image) => ({
      localId: image.id,
      key: image.key,
      url: image.url,
      isCover: image.isCover,
      status: "done" as const,
      progress: 100,
      saved: true,
    })),
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Editar {vehicle.brand} {vehicle.model}
      </h1>
      <VehicleForm mode="edit" vehicleId={vehicle.id} initial={initial} />
    </main>
  );
}
