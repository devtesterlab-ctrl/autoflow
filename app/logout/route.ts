import { signOut } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Destino de las sesiones inválidas (usuario borrado, agencia suspendida, contraseña cambiada).
 * Borra la cookie y manda al login. Sin esto, el middleware (que solo ve que hay cookie) y el panel
 * (que revalida contra la base) se mandarían de uno al otro en un bucle de redirecciones.
 */
export async function GET() {
  await signOut({ redirectTo: "/login?notice=session" });
}
