import { z } from "zod";

export const RESERVED_SLUGS = new Set([
  "app", "www", "api", "admin", "dashboard", "login", "register", "registro", "onboarding", "sites",
  "mail", "smtp", "ftp", "cdn", "static", "assets", "media", "images", "help", "ayuda", "soporte",
  "support", "blog", "status", "autoflow", "staging", "dev", "test", "demo", "docs", "billing",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .replace(/-$/g, "");
}

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(30, "Máximo 30 caracteres")
  .regex(SLUG_PATTERN, "Solo letras, números y guiones (sin empezar ni terminar con guion)")
  .refine((value) => !value.includes("--"), "No uses guiones dobles")
  .refine((value) => !RESERVED_SLUGS.has(value), "Ese nombre está reservado");
