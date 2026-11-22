import { NextResponse } from "next/server";
import { getLeadSummary } from "@/lib/lead-summary";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";

export async function GET() {
  try {
    const { db } = await getAuthenticatedTenant();
    return NextResponse.json(await getLeadSummary(db), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    throw error;
  }
}
