"use server";

import { Prisma } from "@prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { checkVehiclePublishLimit } from "@/lib/plan-limits";
import { deleteObjects, publicUrlFor, vehiclePrefix } from "@/lib/r2";
import { revalidateCatalog } from "@/lib/revalidate";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import {
  firstErrors,
  idSchema,
  statusChangeSchema,
  vehicleFormSchema,
} from "@/lib/validators/vehicle";

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar.";

async function authenticate() {
  try {
    return await getAuthenticatedTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Alta o edición. Sincroniza fotos: crea las nuevas, reordena las existentes y borra las quitadas (DB + R2). */
export async function saveVehicle(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = vehicleFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }

  const data = parsed.data;
  const { db, tenantId, tenant } = ctx;

  // Anti-IDOR: toda key debe pertenecer a este tenant y a este vehículo.
  const prefix = vehiclePrefix(tenantId, data.id);
  const keys = data.images.map((image) => image.key);
  const invalidKey = keys.some((key) => !key.startsWith(prefix) || !key.endsWith(".webp") || key.includes(".."));
  if (invalidKey || new Set(keys).size !== keys.length) {
    return fail("Alguna foto no es válida. Probá subiéndola de nuevo.");
  }

  const limit = await checkVehiclePublishLimit({
    db,
    plan: tenant.plan,
    vehicleId: data.id,
    targetStatus: data.status,
  });
  if (!limit.ok) {
    return { ok: false, error: limit.message, fieldErrors: { status: limit.message } };
  }

  const coverIndex = Math.max(0, data.images.findIndex((image) => image.isCover));
  const images = data.images.map((image, index) => ({
    key: image.key,
    url: publicUrlFor(image.key),
    order: index,
    isCover: index === coverIndex,
  }));

  const fields = {
    brand: data.brand,
    model: data.model,
    version: data.version || null,
    year: data.year,
    mileage: data.mileage,
    price: data.price,
    currency: data.currency,
    transmission: data.transmission,
    fuelType: data.fuelType,
    color: data.color || null,
    description: data.description || null,
    features: data.features,
    status: data.status,
    isFeatured: data.isFeatured,
  };

  let removedKeys: string[] = [];

  try {
    const existing = await db.vehicle.findUnique({ where: { id: data.id }, select: { id: true } });

    if (existing) {
      const current = await db.vehicleImage.findMany({
        where: { vehicleId: data.id },
        select: { id: true, key: true },
      });
      const idByKey = new Map(current.map((row) => [row.key, row.id]));
      const incoming = new Set(keys);
      const removed = current.filter((row) => !incoming.has(row.key));
      removedKeys = removed.map((row) => row.key);

      const kept = images.filter((image) => idByKey.has(image.key));
      const fresh = images.filter((image) => !idByKey.has(image.key));

      await db.$transaction([
        db.vehicle.update({ where: { id: data.id }, data: fields }),
        ...kept.map((image) =>
          db.vehicleImage.update({
            where: { id: idByKey.get(image.key) as string },
            data: { order: image.order, isCover: image.isCover },
          }),
        ),
        db.vehicleImage.deleteMany({ where: { id: { in: removed.map((row) => row.id) } } }),
        db.vehicleImage.createMany({
          data: fresh.map((image) => ({ ...image, vehicleId: data.id, tenantId })),
        }),
      ]);
    } else {
      const lowest = await db.vehicle.aggregate({ _min: { order: true } });
      await db.$transaction([
        db.vehicle.create({
          data: { id: data.id, tenantId, order: (lowest._min.order ?? 0) - 1, ...fields },
        }),
        db.vehicleImage.createMany({
          data: images.map((image) => ({ ...image, vehicleId: data.id, tenantId })),
        }),
      ]);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Este vehículo ya existe. Recargá la página e intentá de nuevo.");
    }
    console.error("[saveVehicle]", error);
    return fail("No pudimos guardar el vehículo. Probá de nuevo.");
  }

  await deleteObjects(removedKeys);
  revalidateCatalog(tenant);
  return { ok: true, data: { id: data.id } };
}

/** Cambio de estado en 1 clic desde la tarjeta del inventario. */
export async function setVehicleStatus(input: unknown): Promise<ActionResult<null>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const limit = await checkVehiclePublishLimit({
    db: ctx.db,
    plan: ctx.tenant.plan,
    vehicleId: parsed.data.id,
    targetStatus: parsed.data.status,
  });
  if (!limit.ok) return fail(limit.message);

  try {
    await ctx.db.vehicle.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("No encontramos ese vehículo.");
    }
    console.error("[setVehicleStatus]", error);
    return fail("No pudimos cambiar el estado.");
  }

  revalidateCatalog(ctx.tenant);
  return { ok: true, data: null };
}

/** Borra el vehículo (las fotos en DB caen por cascade) y todas sus fotos en R2. */
export async function deleteVehicle(input: unknown): Promise<ActionResult<null>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsedId = idSchema.safeParse(input);
  if (!parsedId.success) return fail("Datos inválidos.");

  const vehicle = await ctx.db.vehicle.findUnique({
    where: { id: parsedId.data },
    select: { id: true, images: { select: { key: true } } },
  });
  if (!vehicle) return fail("No encontramos ese vehículo.");

  try {
    await ctx.db.vehicle.delete({ where: { id: vehicle.id } });
  } catch (error) {
    console.error("[deleteVehicle]", error);
    return fail("No pudimos eliminar el vehículo.");
  }

  await deleteObjects(vehicle.images.map((image) => image.key));
  revalidateCatalog(ctx.tenant);
  return { ok: true, data: null };
}

/** Borra de R2 una foto subida que todavía no se guardó (el usuario la quitó antes de guardar). */
export async function deleteUploadedObject(key: unknown): Promise<ActionResult<null>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const prefix = `tenants/${ctx.tenantId}/vehicles/`;
  if (typeof key !== "string" || !key.startsWith(prefix) || !key.endsWith(".webp") || key.includes("..")) {
    return fail("Foto inválida.");
  }

  const saved = await ctx.db.vehicleImage.findFirst({ where: { key }, select: { id: true } });
  if (saved) return fail("La foto ya está guardada en un vehículo.");

  await deleteObjects([key]);
  return { ok: true, data: null };
}
