"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { signOut } from "@/auth";
import type { ActionResult } from "@/lib/action-result";
import { invalidateTenantCatalog } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { brandingPrefix, deleteObjects, keyFromPublicUrl, publicUrlFor } from "@/lib/r2";
import { ForbiddenError, getAuthenticatedTenant, getOwnerTenant, UnauthorizedError } from "@/lib/session";
import { passwordChangeSchema, profileSchema, settingsSchema } from "@/lib/validators/settings";
import { firstErrors } from "@/lib/validators/vehicle";

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar.";

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function authenticateOwner(): Promise<Awaited<ReturnType<typeof getOwnerTenant>> | { error: string }> {
  try {
    return await getOwnerTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: SESSION_EXPIRED };
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

/** Ajustes de la agencia (solo OWNER): identidad, contacto, marca y avisos. */
export async function updateTenantSettings(
  input: unknown,
): Promise<ActionResult<{ slug: string; logoUrl: string | null }>> {
  const ctx = await authenticateOwner();
  if ("error" in ctx) return fail(ctx.error);

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }
  const data = parsed.data;
  const { tenant, tenantId } = ctx;

  // Anti-IDOR: un logo nuevo tiene que estar en la carpeta de branding de ESTA agencia.
  let logoUrl: string | null | undefined;
  if (data.logoAction === "replace" && data.logoKey) {
    const validKey =
      data.logoKey.startsWith(brandingPrefix(tenantId)) && data.logoKey.endsWith(".webp") && !data.logoKey.includes("..");
    if (!validKey) return fail("El logo no es válido. Probá subiéndolo de nuevo.");
    logoUrl = publicUrlFor(data.logoKey);
  } else if (data.logoAction === "remove") {
    logoUrl = null;
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        slug: data.slug,
        whatsappNumber: data.whatsappNumber,
        city: data.city,
        address: data.address || null,
        instagramHandle: data.instagramHandle || null,
        primaryColor: data.primaryColor,
        notifyNewLeads: data.notifyNewLeads,
        notifyEmail: data.notifyEmail || null,
        logoUrl,
      },
      select: { id: true, slug: true, customDomain: true, logoUrl: true },
    });

    // El logo anterior ya no se usa: se borra de R2 (solo si está en la carpeta de esta agencia).
    if (logoUrl !== undefined && tenant.logoUrl) {
      const previousKey = keyFromPublicUrl(tenant.logoUrl);
      if (previousKey && previousKey.startsWith(brandingPrefix(tenantId))) await deleteObjects([previousKey]);
    }

    invalidateTenantCatalog(updated, { slug: tenant.slug });
    revalidatePath("/dashboard", "layout");
    return { ok: true, data: { slug: updated.slug, logoUrl: updated.logoUrl } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ese subdominio ya está en uso.", fieldErrors: { slug: "Ese subdominio ya está en uso." } };
    }
    console.error("[updateTenantSettings]", error);
    return fail("No pudimos guardar los ajustes. Probá de nuevo.");
  }
}

export async function updateProfile(input: unknown): Promise<ActionResult<null>> {
  let userId: string;
  try {
    ({
      user: { id: userId },
    } = await getAuthenticatedTenant());
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail(SESSION_EXPIRED);
    throw error;
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá el nombre.", fieldErrors: firstErrors(parsed.error) };
  }

  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: null };
}

/** Cambia la contraseña, cierra todas las sesiones abiertas y lleva al login. */
export async function changePassword(input: unknown): Promise<ActionResult<null>> {
  let userId: string;
  try {
    ({
      user: { id: userId },
    } = await getAuthenticatedTenant());
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail(SESSION_EXPIRED);
    throw error;
  }

  if (await isRateLimited(`pw-change:${userId}`, 5, 15 * 60 * 1000)) {
    return fail("Demasiados intentos. Esperá unos minutos.");
  }

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, error: "La contraseña actual no es correcta.", fieldErrors: { currentPassword: "No es correcta" } };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10), sessionVersion: { increment: 1 } },
  });

  await signOut({ redirectTo: "/login?notice=changed" });
  return { ok: true, data: null };
}
