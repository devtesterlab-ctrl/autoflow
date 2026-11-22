import { z } from "zod";

export const CURRENCY_VALUES = ["ARS", "USD"] as const;
export const TRANSMISSION_VALUES = ["MANUAL", "AUTOMATIC"] as const;
export const FUEL_VALUES = ["NAFTA", "DIESEL", "GNC", "HYBRID", "ELECTRIC"] as const;
export const STATUS_VALUES = ["PREPARATION", "AVAILABLE", "RESERVED", "SOLD"] as const;

export type CurrencyValue = (typeof CURRENCY_VALUES)[number];
export type TransmissionValue = (typeof TRANSMISSION_VALUES)[number];
export type FuelValue = (typeof FUEL_VALUES)[number];
export type StatusValue = (typeof STATUS_VALUES)[number];

export const MAX_IMAGES_PER_VEHICLE = 20;

export const idSchema = z
  .string()
  .min(10)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/);

export const vehicleFormSchema = z.object({
  id: idSchema,
  brand: z.string().trim().min(1, "Ingresá la marca").max(40, "Máximo 40 caracteres"),
  model: z.string().trim().min(1, "Ingresá el modelo").max(60, "Máximo 60 caracteres"),
  version: z.string().trim().max(80, "Máximo 80 caracteres"),
  year: z
    .number()
    .int()
    .min(1950, "Año inválido")
    .max(new Date().getFullYear() + 1, "Año inválido"),
  mileage: z.number().int().min(0, "Kilometraje inválido").max(2_000_000, "Kilometraje inválido"),
  price: z.number().int().min(1, "Ingresá el precio").max(99_999_999_999, "Precio inválido"),
  currency: z.enum(CURRENCY_VALUES),
  transmission: z.enum(TRANSMISSION_VALUES),
  fuelType: z.enum(FUEL_VALUES),
  color: z.string().trim().max(40, "Máximo 40 caracteres"),
  description: z.string().trim().max(2000, "Máximo 2000 caracteres"),
  features: z.array(z.string().trim().min(1).max(40)).max(30, "Máximo 30 equipamientos"),
  status: z.enum(STATUS_VALUES),
  isFeatured: z.boolean(),
  images: z
    .array(z.object({ key: z.string().min(10).max(300), isCover: z.boolean() }))
    .max(MAX_IMAGES_PER_VEHICLE, `Máximo ${MAX_IMAGES_PER_VEHICLE} fotos`),
});

export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;

export const statusChangeSchema = z.object({
  id: idSchema,
  status: z.enum(STATUS_VALUES),
});

/** Primer mensaje de error por campo (clave = primer segmento del path). */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
