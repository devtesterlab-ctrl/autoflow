import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma, tenantDb } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No tenés permisos para hacer esto") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Fuente única de verdad del tenant en Server Components, Server Actions y Route Handlers.
 *
 * Garantías (prevención de IDOR):
 *  1. El tenantId sale de la sesión firmada (JWT). Nunca de body, params, query ni headers.
 *  2. En cada request se revalida contra la base, en UNA consulta, que el usuario exista, pertenezca
 *     a ese tenant y que la agencia siga activa. Un JWT viejo de un usuario borrado o de una agencia
 *     dada de baja deja de funcionar al instante.
 *  3. El rol se lee de la base (no del JWT): un cambio de rol aplica sin esperar a que expire la sesión.
 *  4. `db` es un cliente Prisma acotado al tenant (`tenantDb`): todo where/create sobre Vehicle,
 *     VehicleImage, Lead y Activity lleva tenantId forzado.
 */
export const getAuthenticatedTenant = cache(async () => {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id || !sessionUser.tenantId) {
    throw new UnauthorizedError();
  }

  const record = await prisma.user.findFirst({
    where: { id: sessionUser.id, tenantId: sessionUser.tenantId, tenant: { isActive: true } },
    select: { id: true, name: true, email: true, role: true, sessionVersion: true, tenant: true },
  });

  if (!record) {
    throw new UnauthorizedError("Sesión inválida o agencia inactiva");
  }

  // Cambiar o recuperar la contraseña sube la versión: las sesiones anteriores dejan de valer.
  if (record.sessionVersion !== sessionUser.sessionVersion) {
    throw new UnauthorizedError("Sesión vencida");
  }

  const { tenant, ...user } = record;
  return { user, tenant, tenantId: tenant.id, db: tenantDb(tenant.id) };
});

/** Igual que getAuthenticatedTenant, pero exige rol OWNER (configuración de la agencia, equipo, etc.). */
export async function getOwnerTenant() {
  const ctx = await getAuthenticatedTenant();
  if (ctx.user.role !== "OWNER") throw new ForbiddenError("Solo el dueño de la agencia puede hacer esto.");
  return ctx;
}

/** Para páginas y layouts: redirige a /login si no hay sesión válida. */
export async function requireTenant() {
  try {
    return await getAuthenticatedTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/logout");
    }
    throw error;
  }
}
