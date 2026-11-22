import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** En la base solo se guarda el hash: si alguien ve la tabla, no puede usar los links. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function findValidResetToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;
  return record;
}
