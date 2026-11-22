const buckets = new Map<string, number[]>();

/** Respaldo en memoria (desarrollo, o si Redis no responde). En serverless cada instancia tiene su propia copia. */
function limitedInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > 5000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) buckets.delete(bucketKey);
    }
  }
  return false;
}

/**
 * Contador por ventana fija en Upstash Redis (API REST, sin dependencias):
 * INCR + PEXPIRE NX en un solo pedido. Devuelve null si Redis no está configurado o falla.
 */
async function limitedInRedis(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redisKey = `rl:${key}`;
    const response = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, String(windowMs), "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;

    const results = (await response.json()) as { result?: number }[];
    const count = results[0]?.result;
    return typeof count === "number" ? count > limit : null;
  } catch (error) {
    console.error("[rate-limit] Redis no disponible, se usa memoria", error);
    return null;
  }
}

/** true si la clave superó `limit` pedidos dentro de `windowMs`. Con Upstash configurado el límite es global. */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const viaRedis = await limitedInRedis(key, limit, windowMs);
  return viaRedis ?? limitedInMemory(key, limit, windowMs);
}
