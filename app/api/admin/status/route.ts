import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/admin";
import { ForbiddenError, UnauthorizedError } from "@/lib/session";
import { getSystemStatus } from "@/lib/system-status";

export async function GET() {
  try {
    await getPlatformAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json(await getSystemStatus(), { headers: { "Cache-Control": "no-store" } });
}
