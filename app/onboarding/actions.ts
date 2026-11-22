"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { invalidateTenantCatalog } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { brandingPrefix, publicUrlFor } from "@/lib/r2";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import { slugSchema } from "@/lib/slug";
import { onboardingSchema } from "@/lib/validators/onboarding";
import { firstErrors } from "@/lib/validators/vehicle";

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

export type SlugStatus = "available" | "taken" | "invalid";

/** Validación en tiempo real del subdominio. El slug propio cuenta como disponible. */
export async function checkSlugAvailability(
  input: unknown,
): Promise<ActionResult<{ status: SlugStatus; message: string }>> {
  const ctx = await authenticate();
  if (!ctx) return fail("Tu sesión expiró. Volvé a ingresar.");

  if (await isRateLimited(`slug-check:${ctx.user.id}`, 40, 60_000)) {
    return fail("Demasiadas consultas. Esperá unos segundos.");
  }

  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: true, data: { status: "invalid", message: parsed.error.issues[0]?.message ?? "Subdominio inválido" } };
  }

  const existing = await prisma.tenant.findUnique({ where: { slug: parsed.data }, select: { id: true } });
  if (existing && existing.id !== ctx.tenantId) {
    return { ok: true, data: { status: "taken", message: "Ese subdominio ya está en uso." } };
  }
  return { ok: true, data: { status: "available", message: "¡Disponible!" } };
}

/** Cierra el onboarding: guarda identidad, contacto y branding en una sola operación. */
export async function completeOnboarding(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const ctx = await authenticate();
  if (!ctx) return fail("Tu sesión expiró. Volvé a ingresar.");
  if (ctx.user.role !== "OWNER") return fail("Solo el dueño puede configurar la agencia.");
  if (ctx.tenant.onboardingCompleted) return fail("La agencia ya está configurada.");

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }
  const data = parsed.data;

  // Anti-IDOR: el logo tiene que estar en la carpeta de branding de ESTA agencia.
  let logoUrl: string | null = null;
  if (data.logoKey) {
    const validKey =
      data.logoKey.startsWith(brandingPrefix(ctx.tenantId)) &&
      data.logoKey.endsWith(".webp") &&
      !data.logoKey.includes("..");
    if (!validKey) return fail("El logo no es válido. Probá subiéndolo de nuevo.");
    logoUrl = publicUrlFor(data.logoKey);
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        name: data.name,
        slug: data.slug,
        whatsappNumber: data.whatsappNumber,
        city: data.city,
        address: data.address || null,
        instagramHandle: data.instagramHandle || null,
        primaryColor: data.primaryColor,
        logoUrl,
        onboardingCompleted: true,
      },
      select: { id: true, slug: true, customDomain: true },
    });

    invalidateTenantCatalog(updated, { slug: ctx.tenant.slug });
    revalidatePath("/dashboard", "layout");
    return { ok: true, data: { slug: updated.slug } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ese subdominio ya está en uso.", fieldErrors: { slug: "Ese subdominio ya está en uso." } };
    }
    console.error("[completeOnboarding]", error);
    return fail("No pudimos guardar la configuración. Probá de nuevo.");
  }
}
