import "server-only";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";

/** Emails con acceso al panel de administración (variable PLATFORM_ADMIN_EMAILS, separados por coma). */
function getAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && getAdminEmails().includes((email as string).toLowerCase());
}

/** Para Server Actions y Route Handlers: lanza si no hay sesión válida o si el usuario no es administrador. */
export async function getPlatformAdmin() {
  const ctx = await getAuthenticatedTenant();
  if (!isPlatformAdminEmail(ctx.user.email)) throw new ForbiddenError();
  return ctx;
}

/**
 * Para páginas /admin. Un usuario común recibe 404 (no se revela que la ruta existe).
 * Se llama en CADA página: los layouts de Next no se vuelven a ejecutar en navegaciones del cliente,
 * así que no alcanzan como única barrera.
 */
export async function requirePlatformAdmin() {
  try {
    return await getPlatformAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/logout");
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
}
