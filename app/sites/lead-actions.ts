"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { tenantDb } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";
import { PUBLIC_STATUSES } from "@/lib/public-vehicle";
import { isRateLimited } from "@/lib/rate-limit";
import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";
import { formatPrice } from "@/lib/vehicle-ui";
import { idSchema } from "@/lib/validators/vehicle";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";

const inputSchema = z.object({
  domain: z.string().min(1).max(253),
  vehicleId: idSchema,
  name: z.string().trim().max(60),
  website: z.string().max(200),
});

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Registra el lead del catálogo y devuelve el link de WhatsApp con el mensaje armado.
 * Nunca bloquea la consulta: ante honeypot, límite de uso o error de base,
 * igual devuelve el link para que el comprador pueda escribir.
 */
export async function registerLead(
  input: unknown,
): Promise<ActionResult<{ whatsappUrl: string; leadSaved: boolean }>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { domain, vehicleId, name, website } = parsed.data;

  const tenant = await getTenantByDomain(domain);
  if (!tenant) return fail("Agencia no encontrada.");

  const whatsappNumber = normalizeWhatsappNumber(tenant.whatsappNumber);
  if (!whatsappNumber) return fail("Esta agencia todavía no configuró su WhatsApp.");

  const db = tenantDb(tenant.id);
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, status: { in: PUBLIC_STATUSES } },
    select: { id: true, brand: true, model: true, version: true, year: true, price: true, currency: true },
  });
  if (!vehicle) return fail("Este auto ya no está disponible.");

  const title = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  const link = `${getTenantOrigin(tenant)}/auto/${vehicle.id}`;
  const text = `Hola ${tenant.name}! Vi el ${title} ${vehicle.year} (${formatPrice(Number(vehicle.price), vehicle.currency)}) en su catálogo y quiero consultar. ${link}`;
  const whatsappUrl = buildWhatsappUrl(whatsappNumber, text);

  // Honeypot: los bots completan el campo oculto. Los dejamos seguir pero sin crear lead.
  if (website.trim() !== "") {
    return { ok: true, data: { whatsappUrl, leadSaved: false } };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  if (await isRateLimited(`lead:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)) {
    return { ok: true, data: { whatsappUrl, leadSaved: false } };
  }

  try {
    const lead = await db.lead.create({
      data: {
        tenantId: tenant.id,
        vehicleId: vehicle.id,
        clientName: name || "Consulta web",
        source: "WHATSAPP_CATALOG",
        status: "NEW",
      },
    });

    await db.activity.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        type: "CREATED",
        content: "Consulta desde el catálogo web",
      },
    });

    // Se envía después de responder al comprador: no lo hace esperar.
    after(() =>
      notifyNewLead({
        tenantId: tenant.id,
        leadName: name || "Consulta web",
        vehicleLabel: `${title} ${vehicle.year}`,
      }),
    );

    return { ok: true, data: { whatsappUrl, leadSaved: true } };
  } catch (error) {
    console.error("[registerLead]", error);
    return { ok: true, data: { whatsappUrl, leadSaved: false } };
  }
}
