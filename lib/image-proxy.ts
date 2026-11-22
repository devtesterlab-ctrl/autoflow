import "server-only";

/**
 * Solo se proxean imágenes de orígenes conocidos (R2 público; picsum únicamente fuera de producción
 * para que funcionen las fotos del seed). Evita que el proxy sirva para SSRF.
 */
export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (url.protocol !== "https:" && !(!isProd && url.protocol === "http:")) return false;

  const allowed = new Set<string>();
  const r2 = process.env.R2_PUBLIC_URL;
  if (r2) {
    try {
      allowed.add(new URL(r2).origin);
    } catch {
      // R2_PUBLIC_URL inválida: se ignora.
    }
  }
  if (!isProd) allowed.add("https://picsum.photos");

  return allowed.has(url.origin);
}
