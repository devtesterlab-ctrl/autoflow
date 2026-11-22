import "server-only";
import { prisma, type TenantDb } from "@/lib/db";
import {
  ACTIVE_VEHICLE_STATUSES,
  isActiveStatus,
  NEXT_PLAN,
  PLAN_LIMITS,
  type PlanUsage,
  type PlanValue,
} from "@/lib/plan-config";

export { PLAN_LIMITS, NEXT_PLAN, canUseCustomDomain, CUSTOM_DOMAIN_PLANS } from "@/lib/plan-config";
export type { PlanUsage, PlanValue } from "@/lib/plan-config";

export type LimitCheck = { ok: true } | { ok: false; message: string; limit: number; current: number };

const ACTIVE_STATUSES = [...ACTIVE_VEHICLE_STATUSES];

export async function getPlanUsage(db: TenantDb, tenantId: string, plan: PlanValue): Promise<PlanUsage> {
  const limits = PLAN_LIMITS[plan];
  const [activeVehicles, users] = await Promise.all([
    db.vehicle.count({ where: { status: { in: ACTIVE_STATUSES } } }),
    prisma.user.count({ where: { tenantId } }),
  ]);

  return {
    plan,
    label: limits.label,
    activeVehicles,
    maxActiveVehicles: limits.maxActiveVehicles,
    users,
    maxUsers: limits.maxUsers,
    atVehicleLimit: activeVehicles >= limits.maxActiveVehicles,
    nearVehicleLimit: activeVehicles >= Math.ceil(limits.maxActiveVehicles * 0.8),
    nextPlan: NEXT_PLAN[plan],
  };
}

/**
 * Guard de publicación. Se llama antes de crear un vehículo o de cambiarle el estado.
 * Solo bloquea cuando el vehículo PASA a estar activo (AVAILABLE/RESERVED) y el tenant ya está en el tope:
 * editar un auto que ya está activo, o moverlo a PREPARATION/SOLD, nunca se bloquea.
 */
export async function checkVehiclePublishLimit(params: {
  db: TenantDb;
  plan: PlanValue;
  vehicleId: string;
  targetStatus: string;
}): Promise<LimitCheck> {
  const { db, plan, vehicleId, targetStatus } = params;
  if (!isActiveStatus(targetStatus)) return { ok: true };

  const existing = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
  if (existing && isActiveStatus(existing.status)) return { ok: true };

  const { label, maxActiveVehicles } = PLAN_LIMITS[plan];
  const current = await db.vehicle.count({
    where: { status: { in: ACTIVE_STATUSES }, id: { not: vehicleId } },
  });

  if (current >= maxActiveVehicles) {
    return {
      ok: false,
      limit: maxActiveVehicles,
      current,
      message: `Llegaste al límite de tu plan ${label} (${maxActiveVehicles} autos activos). Pasá un auto a "Vendido" o "En preparación", o pedí el upgrade para publicar más.`,
    };
  }
  return { ok: true };
}

/** Guard para el alta de vendedores (equipo). Listo para usarse al agregar la invitación de usuarios. */
export async function checkUserLimit(params: { tenantId: string; plan: PlanValue }): Promise<LimitCheck> {
  const { label, maxUsers } = PLAN_LIMITS[params.plan];
  const current = await prisma.user.count({ where: { tenantId: params.tenantId } });

  if (current >= maxUsers) {
    return {
      ok: false,
      limit: maxUsers,
      current,
      message: `Tu plan ${label} permite ${maxUsers} ${maxUsers === 1 ? "usuario" : "usuarios"}. Pedí el upgrade para sumar más vendedores.`,
    };
  }
  return { ok: true };
}
