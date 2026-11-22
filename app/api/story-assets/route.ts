import { NextResponse } from "next/server";
import { isAllowedImageUrl } from "@/lib/image-proxy";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import { idSchema } from "@/lib/validators/vehicle";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Sirve la foto de portada o el logo desde el mismo origen del panel, para que el canvas de la
 * placa de Instagram no quede "tainted" y no haga falta configurar CORS de lectura en R2.
 * Requiere sesión y solo entrega imágenes del tenant autenticado.
 */
export async function GET(request: Request) {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedTenant>>;
  try {
    ctx = await getAuthenticatedTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    throw error;
  }

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  let sourceUrl: string | null = null;

  if (type === "cover") {
    const vehicleId = idSchema.safeParse(params.get("vehicleId"));
    if (!vehicleId.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

    const image = await ctx.db.vehicleImage.findFirst({
      where: { vehicleId: vehicleId.data },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { url: true },
    });
    sourceUrl = image?.url ?? null;
  } else if (type === "logo") {
    sourceUrl = ctx.tenant.logoUrl;
  } else {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!sourceUrl || !isAllowedImageUrl(sourceUrl)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const upstream = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000) });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "Imagen demasiado grande" }, { status: 413 });

    return new Response(bytes, {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("[story-assets]", error);
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
