import { NextResponse } from "next/server";
import { createPresignedLogoUpload } from "@/lib/r2";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import { logoPresignSchema } from "@/lib/validators/upload";

export async function POST(request: Request) {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedTenant>>;
  try {
    ctx = await getAuthenticatedTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    throw error;
  }

  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el dueño puede cambiar el logo" }, { status: 403 });
  }

  const parsed = logoPresignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const presigned = await createPresignedLogoUpload({ tenantId: ctx.tenantId, size: parsed.data.size });
  return NextResponse.json(presigned, { headers: { "Cache-Control": "no-store" } });
}
