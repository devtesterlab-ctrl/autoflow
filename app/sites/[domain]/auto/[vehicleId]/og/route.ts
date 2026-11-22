import sharp from "sharp";
import { isAllowedImageUrl } from "@/lib/image-proxy";
import { tenantDb } from "@/lib/db";
import { PUBLIC_ID_PATTERN, PUBLIC_STATUSES } from "@/lib/public-vehicle";
import { getTenantByDomain } from "@/lib/tenant";

export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/**
 * Imagen para la vista previa de WhatsApp / redes: JPEG 1200x630 liviano.
 * Las fotos del catálogo son WebP y varias plataformas no las muestran bien en previews.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string; vehicleId: string }> },
) {
  const { domain, vehicleId } = await params;
  if (!PUBLIC_ID_PATTERN.test(vehicleId)) return new Response("Not found", { status: 404 });

  const tenant = await getTenantByDomain(domain);
  if (!tenant) return new Response("Not found", { status: 404 });

  const vehicle = await tenantDb(tenant.id).vehicle.findFirst({
    where: { id: vehicleId, status: { in: PUBLIC_STATUSES } },
    select: { images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1, select: { url: true } } },
  });
  const sourceUrl = vehicle?.images[0]?.url;
  if (!sourceUrl || !isAllowedImageUrl(sourceUrl)) return new Response("Not found", { status: 404 });

  try {
    const upstream = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return new Response("Not found", { status: 404 });

    const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) return new Response("Not found", { status: 404 });

    const source = Buffer.from(await upstream.arrayBuffer());
    if (source.byteLength > MAX_SOURCE_BYTES) return new Response("Not found", { status: 404 });

    const jpeg = await sharp(source)
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[og-image]", error);
    return new Response("Not found", { status: 404 });
  }
}
