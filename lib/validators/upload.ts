import { z } from "zod";
import { idSchema } from "@/lib/validators/vehicle";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const presignRequestSchema = z.object({
  vehicleId: idSchema,
  contentType: z.literal("image/webp"),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export interface PresignedResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  headers: Record<string, string>;
}

export const MAX_LOGO_BYTES = 1024 * 1024;

export const logoPresignSchema = z.object({
  contentType: z.literal("image/webp"),
  size: z.number().int().positive().max(MAX_LOGO_BYTES),
});
