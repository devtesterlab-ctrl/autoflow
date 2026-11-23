/**
 * Modo "una agencia por dirección" (sin dominio propio de la plataforma).
 *
 * Variable SINGLE_TENANT_HOSTS: lista separada por comas de pares host=subdominio, por ejemplo
 *   mi-proyecto.vercel.app=palermo-autos
 * En ese host, la portada (/), las fichas (/auto/...) y robots/sitemap muestran el catálogo de esa agencia,
 * y el panel sigue disponible en /login, /dashboard, etc. Archivo sin dependencias: lo usa el middleware (Edge).
 */
export function parseSingleTenantHosts(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const [host, slug] = pair.split("=").map((part) => part.trim().toLowerCase());
    if (host && slug) map.set(host.split(":")[0], slug);
  }
  return map;
}

export function isCatalogPath(path: string): boolean {
  return path === "/" || path.startsWith("/auto/") || path === "/robots.txt" || path === "/sitemap.xml";
}
