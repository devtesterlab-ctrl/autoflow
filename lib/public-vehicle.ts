import "server-only";
import { unstable_cache } from "next/cache";
import { VehicleStatus } from "@prisma/client";
import { tenantTag } from "@/lib/cache";
import type { PublicVehicle, PublicVehicleDetail } from "@/lib/catalog-types";
import { tenantDb } from "@/lib/db";

/** Solo estos estados se ven en el catálogo público. PREPARATION y SOLD quedan ocultos. */
export const PUBLIC_STATUSES: VehicleStatus[] = [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED];

export const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{10,40}$/;

const REVALIDATE_SECONDS = 86_400;

async function queryPublicVehicles(tenantId: string): Promise<PublicVehicle[]> {
  const rows = await tenantDb(tenantId).vehicle.findMany({
    where: { status: { in: PUBLIC_STATUSES } },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    take: 200,
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
  });

  return rows.map((row) => ({
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
    status: row.status === "RESERVED" ? "RESERVED" : "AVAILABLE",
    isFeatured: row.isFeatured,
    coverUrl: row.images[0]?.url ?? null,
  }));
}

async function queryPublicVehicleDetail(tenantId: string, vehicleId: string): Promise<PublicVehicleDetail | null> {
  const row = await tenantDb(tenantId).vehicle.findFirst({
    where: { id: vehicleId, status: { in: PUBLIC_STATUSES } },
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
      color: true,
      description: true,
      features: true,
      status: true,
      images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], select: { id: true, url: true } },
    },
  });
  if (!row) return null;

  return {
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
    color: row.color,
    description: row.description,
    features: row.features,
    status: row.status === "RESERVED" ? "RESERVED" : "AVAILABLE",
    images: row.images,
  };
}

/** Listado público cacheado por agencia. Se regenera con `invalidateTenantCatalog`. */
export function getPublicVehicles(tenantId: string): Promise<PublicVehicle[]> {
  return unstable_cache(() => queryPublicVehicles(tenantId), ["public-vehicles", tenantId], {
    tags: [tenantTag(tenantId)],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/** Ficha pública cacheada. Un auto vendido o en preparación devuelve null (404). */
export function getPublicVehicleDetail(tenantId: string, vehicleId: string): Promise<PublicVehicleDetail | null> {
  return unstable_cache(
    () => queryPublicVehicleDetail(tenantId, vehicleId),
    ["public-vehicle", tenantId, vehicleId],
    { tags: [tenantTag(tenantId)], revalidate: REVALIDATE_SECONDS },
  )();
}
