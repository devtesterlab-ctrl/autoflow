export type PlanValue = "FREE" | "STARTER" | "PRO";

export interface PlanLimits {
  label: string;
  maxActiveVehicles: number;
  maxUsers: number;
  customDomain: boolean;
}

/** Única fuente de verdad de los límites. Para cambiar un plan se edita solo esta tabla. */
export const PLAN_LIMITS: Record<PlanValue, PlanLimits> = {
  FREE: { label: "Free", maxActiveVehicles: 5, maxUsers: 1, customDomain: false },
  STARTER: { label: "Starter", maxActiveVehicles: 15, maxUsers: 1, customDomain: false },
  PRO: { label: "Pro", maxActiveVehicles: 60, maxUsers: 5, customDomain: true },
};

/** Un vehículo "activo" es el que cuenta contra el límite del plan. */
export const ACTIVE_VEHICLE_STATUSES = ["AVAILABLE", "RESERVED"] as const;

export const NEXT_PLAN: Record<PlanValue, PlanValue | null> = {
  FREE: "STARTER",
  STARTER: "PRO",
  PRO: null,
};

export const CUSTOM_DOMAIN_PLANS: PlanValue[] = (Object.keys(PLAN_LIMITS) as PlanValue[]).filter(
  (plan) => PLAN_LIMITS[plan].customDomain,
);

export function canUseCustomDomain(plan: PlanValue): boolean {
  return PLAN_LIMITS[plan].customDomain;
}

export function isActiveStatus(status: string): boolean {
  return (ACTIVE_VEHICLE_STATUSES as readonly string[]).includes(status);
}

export interface PlanUsage {
  plan: PlanValue;
  label: string;
  activeVehicles: number;
  maxActiveVehicles: number;
  users: number;
  maxUsers: number;
  atVehicleLimit: boolean;
  nearVehicleLimit: boolean;
  nextPlan: PlanValue | null;
}
