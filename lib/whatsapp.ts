/** Devuelve solo dígitos (formato que pide wa.me) o null si el número no es utilizable. */
export function normalizeWhatsappNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function buildWhatsappUrl(digits: string, text?: string): string {
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Convierte un teléfono cargado a mano (ej: "11 5555-1234", "+54 9 11 5555 1234", "011 15 5555 1234")
 * a los dígitos que pide wa.me para celulares argentinos. Devuelve null si no se puede usar.
 */
export function phoneToWhatsappDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 8) return null;

  if (digits.startsWith("54")) {
    if (!digits.startsWith("549") && digits.length === 12) digits = `549${digits.slice(2)}`;
    return digits.length >= 12 && digits.length <= 13 ? digits : null;
  }

  digits = digits.replace(/^0/, "");
  if (digits.length === 10) return `549${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}
