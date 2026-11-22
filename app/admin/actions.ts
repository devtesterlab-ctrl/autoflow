"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { getPlatformAdmin } from "@/lib/admin";
import { invalidateTenantCatalog } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { canUseCustomDomain } from "@/lib/plan-config";
import { ForbiddenError, UnauthorizedError } from "@/lib/session";
import { idSchema } from "@/lib/validators/vehicle";

// Este módulo usa `prisma` directo a propósito: el administrador de la plataforma opera sobre todas
// las agencias. Cada acción exige getPlatformAdmin() antes de tocar nada y deja registro de auditoría.

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function authenticateAdmin() {
  try {
    return await getPlatformAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) return null;
    throw error;
  }
}

async function audit(adminEmail: string, tenant: { id: string; name: string }, action: string, detail: string) {
  await prisma.adminAuditLog.create({
    data: { adminEmail, tenantId: tenant.id, tenantName: tenant.name, action, detail },
  });
}

function refreshAdminViews(tenantId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/agencias/${tenantId}`);
}

const tenantSelect = { id: true, name: true, slug: true, customDomain: true, plan: true, isActive: true } as const;

const planSchema = z.object({ tenantId: idSchema, plan: z.enum(["FREE", "STARTER", "PRO"]) });
const activeSchema = z.object({ tenantId: idSchema, active: z.boolean() });

const DOMAIN_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const domainSchema = z.object({
  tenantId: idSchema,
  domain: z.string().trim().toLowerCase().regex(DOMAIN_PATTERN, "Dominio inválido (ej: www.miagencia.com)").nullable(),
});

export async function setTenantPlan(input: unknown): Promise<ActionResult<null>> {
  const admin = await authenticateAdmin();
  if (!admin) return fail("No autorizado.");

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { tenantId, plan } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect });
  if (!tenant) return fail("No encontramos esa agencia.");
  if (tenant.plan === plan) return { ok: true, data: null };

  // Si el nuevo plan no incluye dominio propio, se quita para que no quede asignado sin funcionar.
  const clearDomain = !canUseCustomDomain(plan) && tenant.customDomain !== null;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan, ...(clearDomain ? { customDomain: null } : {}) },
    select: { id: true, slug: true, customDomain: true },
  });

  await audit(
    admin.user.email,
    tenant,
    "plan",
    `${tenant.plan} → ${plan}${clearDomain ? ` (se quitó el dominio ${tenant.customDomain})` : ""}`,
  );
  invalidateTenantCatalog(updated, { slug: tenant.slug, customDomain: tenant.customDomain });
  refreshAdminViews(tenantId);
  return { ok: true, data: null };
}

export async function setTenantActive(input: unknown): Promise<ActionResult<null>> {
  const admin = await authenticateAdmin();
  if (!admin) return fail("No autorizado.");

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { tenantId, active } = parsed.data;

  if (!active && tenantId === admin.tenantId) return fail("No podés suspender tu propia agencia.");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect });
  if (!tenant) return fail("No encontramos esa agencia.");
  if (tenant.isActive === active) return { ok: true, data: null };

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: active },
    select: { id: true, slug: true, customDomain: true },
  });

  await audit(admin.user.email, tenant, active ? "reactivar" : "suspender", active ? "Agencia reactivada" : "Agencia suspendida");
  invalidateTenantCatalog(updated);
  refreshAdminViews(tenantId);
  return { ok: true, data: null };
}

export async function setTenantCustomDomain(input: unknown): Promise<ActionResult<null>> {
  const admin = await authenticateAdmin();
  if (!admin) return fail("No autorizado.");

  const parsed = domainSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { tenantId, domain } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect });
  if (!tenant) return fail("No encontramos esa agencia.");

  if (domain) {
    if (!canUseCustomDomain(tenant.plan)) return fail("El plan de esta agencia no incluye dominio propio.");
    const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").split(":")[0].toLowerCase();
    if (domain === root || domain.endsWith(`.${root}`)) {
      return fail("Ese dominio pertenece a la plataforma: usá el subdominio (slug) de la agencia.");
    }
  }
  if (tenant.customDomain === domain) return { ok: true, data: null };

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: domain },
      select: { id: true, slug: true, customDomain: true },
    });

    await audit(
      admin.user.email,
      tenant,
      "dominio",
      `${tenant.customDomain ?? "(ninguno)"} → ${domain ?? "(ninguno)"}`,
    );
    invalidateTenantCatalog(updated, { slug: tenant.slug, customDomain: tenant.customDomain });
    if (domain) invalidateTenantCatalog({ ...updated, customDomain: domain });
    refreshAdminViews(tenantId);
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Ese dominio ya está asignado a otra agencia.");
    }
    console.error("[setTenantCustomDomain]", error);
    return fail("No pudimos guardar el dominio.");
  }
}
