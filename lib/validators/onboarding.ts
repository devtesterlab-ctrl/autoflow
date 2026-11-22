import { z } from "zod";
import { slugSchema } from "@/lib/slug";
import { phoneToWhatsappDigits } from "@/lib/whatsapp";

/** Acepta "+54 9 11 5555-1234", "11 5555 1234", "+54 11 5555 1234" y devuelve "+5491155551234" (celular argentino). */
export function normalizeArgentineWhatsapp(raw: string): string | null {
  const digits = phoneToWhatsappDigits(raw);
  return digits && /^549\d{10}$/.test(digits) ? `+${digits}` : null;
}

export const nameStepSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre de la agencia").max(60, "Máximo 60 caracteres"),
  slug: slugSchema,
});

export const contactStepSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .refine((value) => normalizeArgentineWhatsapp(value) !== null, "Usá el formato +54 9 11 5555 1234")
    .transform((value) => normalizeArgentineWhatsapp(value) ?? value),
  city: z.string().trim().min(2, "Ingresá la ciudad").max(60, "Máximo 60 caracteres"),
  address: z.string().trim().max(120, "Máximo 120 caracteres"),
  instagramHandle: z
    .string()
    .trim()
    .regex(/^@?[A-Za-z0-9._]{0,30}$/, "Usuario de Instagram inválido")
    .transform((value) => value.replace(/^@/, "")),
});

export const brandingStepSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Elegí un color válido")
    .transform((value) => value.toUpperCase()),
  logoKey: z.string().max(300).nullable(),
});

export const onboardingSchema = z.object({
  ...nameStepSchema.shape,
  ...contactStepSchema.shape,
  ...brandingStepSchema.shape,
});
