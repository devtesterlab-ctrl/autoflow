import { z } from "zod";
import { LEAD_STATUS_VALUES, MANUAL_SOURCE_VALUES } from "@/lib/lead-types";
import { idSchema } from "@/lib/validators/vehicle";

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Teléfono demasiado largo")
  .refine(
    (value) => value === "" || (/^[0-9+\-()\s.]{6,30}$/.test(value) && value.replace(/\D/g, "").length >= 8),
    "Teléfono inválido",
  );

const followUpSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")
  .nullable();

const nameSchema = z.string().trim().min(2, "Ingresá el nombre").max(80, "Máximo 80 caracteres");
const statusSchema = z.enum(LEAD_STATUS_VALUES);

export const createLeadSchema = z.object({
  clientName: nameSchema,
  clientPhone: phoneSchema,
  vehicleId: idSchema.nullable(),
  source: z.enum(MANUAL_SOURCE_VALUES),
  status: statusSchema,
  notes: z.string().trim().max(500, "Máximo 500 caracteres"),
  nextFollowUp: followUpSchema,
});

export const updateLeadSchema = z.object({
  id: idSchema,
  clientName: nameSchema,
  clientPhone: phoneSchema,
  vehicleId: idSchema.nullable(),
  status: statusSchema,
  nextFollowUp: followUpSchema,
});

export const leadStatusSchema = z.object({ id: idSchema, status: statusSchema });
export const leadNoteSchema = z.object({
  id: idSchema,
  note: z.string().trim().min(1, "Escribí la nota").max(500, "Máximo 500 caracteres"),
});
