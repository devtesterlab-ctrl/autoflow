const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_BRAND_COLOR = "#111111";

/** Solo deja pasar #RRGGBB: el valor termina dentro de un style, así que nunca se confía en el string crudo. */
export function safeBrandColor(value: string | null | undefined): string {
  return value && HEX_COLOR.test(value) ? value : DEFAULT_BRAND_COLOR;
}

/** Elige texto blanco o negro según la luminancia del color de marca (WCAG). */
export function readableTextColor(hex: string): "#ffffff" | "#111111" {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? "#111111" : "#ffffff";
}
