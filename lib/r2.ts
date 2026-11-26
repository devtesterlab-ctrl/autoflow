import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { PresignedResponse } from "@/lib/validators/upload";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
      // Sin esto el SDK v3 agrega checksums CRC32 a la URL firmada y R2/navegador la rechazan.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return cachedClient;
}

export function vehiclePrefix(tenantId: string, vehicleId: string): string {
  return `tenants/${tenantId}/vehicles/${vehicleId}/`;
}

export function publicUrlFor(key: string): string {
  return `${requireEnv("R2_PUBLIC_URL").replace(/\/+$/, "")}/${key}`;
}

export async function createPresignedUpload(params: {
  tenantId: string;
  vehicleId: string;
  size: number;
}): Promise<PresignedResponse> {
  const key = `${vehiclePrefix(params.tenantId, params.vehicleId)}${randomUUID()}.webp`;

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
      ContentType: "image/webp",
      ContentLength: params.size,
      CacheControl: CACHE_CONTROL,
    }),
    { expiresIn: 120 },
  );

  return {
    uploadUrl,
    key,
    publicUrl: publicUrlFor(key),
    headers: { "Content-Type": "image/webp", "Cache-Control": CACHE_CONTROL },
  };
}

/** Borra objetos en R2. Es best-effort: loguea el error y no rompe el flujo del usuario. */
export async function deleteObjects(keys: string[]): Promise<void> {
  const safeKeys = keys.filter((key) => key.startsWith("tenants/") && !key.includes(".."));
  if (safeKeys.length === 0) return;

  for (let start = 0; start < safeKeys.length; start += 1000) {
    const chunk = safeKeys.slice(start, start + 1000);
    try {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: requireEnv("R2_BUCKET"),
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    } catch (error) {
      console.error("[r2] No se pudieron borrar objetos", { count: chunk.length, error });
    }
  }
}

export function brandingPrefix(tenantId: string): string {
  return `tenants/${tenantId}/branding/`;
}

export async function createPresignedLogoUpload(params: { tenantId: string; size: number }): Promise<PresignedResponse> {
  const key = `${brandingPrefix(params.tenantId)}${randomUUID()}.webp`;

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
      ContentType: "image/webp",
      ContentLength: params.size,
      CacheControl: CACHE_CONTROL,
    }),
    { expiresIn: 120 },
  );

  return {
    uploadUrl,
    key,
    publicUrl: publicUrlFor(key),
    headers: { "Content-Type": "image/webp", "Cache-Control": CACHE_CONTROL },
  };
}

/** Inversa de publicUrlFor: devuelve la key si la URL pertenece a nuestro bucket público, o null. */
export function keyFromPublicUrl(url: string): string | null {
  const base = `${requireEnv("R2_PUBLIC_URL").replace(/\/+$/, "")}/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}

/** Para el tablero de estado del administrador. */
export function getR2Client(): S3Client {
  return getClient();
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET");
}
