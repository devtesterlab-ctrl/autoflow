import { z } from "zod";
import { brandingStepSchema, contactStepSchema, nameStepSchema } from "@/lib/validators/onboarding";

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres");

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre").max(60, "Máximo 60 caracteres"),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual").max(128),
  newPassword: passwordSchema,
});

export const settingsSchema = z
  .object({
    ...nameStepSchema.shape,
    ...contactStepSchema.shape,
    primaryColor: brandingStepSchema.shape.primaryColor,
    logoAction: z.enum(["keep", "remove", "replace"]),
    logoKey: z.string().max(300).nullable(),
    notifyNewLeads: z.boolean(),
    notifyEmail: z
      .string()
      .trim()
      .max(120, "Máximo 120 caracteres")
      .refine((value) => value === "" || z.string().email().safeParse(value).success, "Email inválido"),
  })
  .refine((data) => data.logoAction !== "replace" || Boolean(data.logoKey), {
    message: "Subí el logo de nuevo",
    path: ["logoKey"],
  });
