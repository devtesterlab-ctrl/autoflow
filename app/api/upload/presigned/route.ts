import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPresignedUpload } from "@/lib/r2";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import { presignRequestSchema } from "@/lib/validators/upload";

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await getAuthenticatedTenant());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    throw error;
  }

  const parsed = presignRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { vehicleId, size } = parsed.data;

  // El auto puede no existir todavía (alta nueva). Si existe, tiene que ser de este tenant.
  // Se usa prisma directo a propósito: necesitamos ver el tenantId real del registro.
  const existing = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { tenantId: true },
  });
  if (existing && existing.tenantId !== tenantId) {
    return NextResponse.json({ error: "Vehículo inválido" }, { status: 403 });
  }

  const presigned = await createPresignedUpload({ tenantId, vehicleId, size });
  return NextResponse.json(presigned, { headers: { "Cache-Control": "no-store" } });
}
