"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { leadSelect, toLeadDTO } from "@/lib/lead-dto";
import { isClosedStatus, type ActivityDTO, type LeadDTO } from "@/lib/lead-types";
import { revalidateCatalog } from "@/lib/revalidate";
import { getAuthenticatedTenant, UnauthorizedError } from "@/lib/session";
import {
  createLeadSchema,
  leadNoteSchema,
  leadStatusSchema,
  updateLeadSchema,
} from "@/lib/validators/lead";
import { firstErrors, idSchema } from "@/lib/validators/vehicle";

const LEADS_PATH = "/dashboard/leads";
const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar.";

async function authenticate() {
  try {
    return await getAuthenticatedTenant();
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export async function getLeadActivities(input: unknown): Promise<ActionResult<ActivityDTO[]>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const id = idSchema.safeParse(input);
  if (!id.success) return fail("Datos inválidos.");

  const rows = await ctx.db.activity.findMany({
    where: { leadId: id.data },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, type: true, content: true, createdAt: true, user: { select: { name: true } } },
  });

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      userName: row.user?.name ?? null,
    })),
  };
}

/** Alta manual (alguien que entró al local, llegó por Instagram, etc.). */
export async function createLead(input: unknown): Promise<ActionResult<LeadDTO>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }
  const data = parsed.data;
  const { db, tenantId, user } = ctx;

  if (data.vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId }, select: { id: true } });
    if (!vehicle) return fail("El auto elegido no existe.");
  }

  const closing = isClosedStatus(data.status);
  const nextFollowUp = !closing && data.nextFollowUp ? new Date(data.nextFollowUp) : null;

  try {
    const created = await db.lead.create({
      data: {
        tenantId,
        vehicleId: data.vehicleId,
        clientName: data.clientName,
        clientPhone: data.clientPhone || null,
        source: data.source,
        status: data.status,
        notes: data.notes || null,
        nextFollowUp,
      },
      select: leadSelect,
    });

    const activities: Prisma.ActivityCreateManyInput[] = [
      { tenantId, leadId: created.id, userId: user.id, type: "CREATED", content: "Lead cargado a mano" },
    ];
    if (data.notes) {
      activities.push({ tenantId, leadId: created.id, userId: user.id, type: "NOTE", content: data.notes });
    }
    if (nextFollowUp) {
      activities.push({
        tenantId,
        leadId: created.id,
        userId: user.id,
        type: "FOLLOW_UP_SET",
        content: nextFollowUp.toISOString(),
      });
    }
    await db.activity.createMany({ data: activities });

    revalidatePath(LEADS_PATH);
    return { ok: true, data: toLeadDTO(created) };
  } catch (error) {
    console.error("[createLead]", error);
    return fail("No pudimos guardar el lead. Probá de nuevo.");
  }
}

/** Edición completa desde el drawer. Registra en la línea de tiempo los cambios de estado y de seguimiento. */
export async function updateLead(input: unknown): Promise<ActionResult<LeadDTO>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  }
  const data = parsed.data;
  const { db, tenantId, user } = ctx;

  const current = await db.lead.findUnique({
    where: { id: data.id },
    select: { id: true, vehicleId: true, status: true, nextFollowUp: true },
  });
  if (!current) return fail("No encontramos ese lead.");

  if (data.vehicleId && data.vehicleId !== current.vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId }, select: { id: true } });
    if (!vehicle) return fail("El auto elegido no existe.");
  }

  const closing = isClosedStatus(data.status);
  const nextFollowUp = !closing && data.nextFollowUp ? new Date(data.nextFollowUp) : null;

  const activities: Prisma.ActivityCreateManyInput[] = [];
  if (current.status !== data.status) {
    activities.push({
      tenantId,
      leadId: data.id,
      userId: user.id,
      type: "STATUS_CHANGE",
      content: `${current.status}>${data.status}`,
    });
  }
  if ((current.nextFollowUp?.getTime() ?? null) !== (nextFollowUp?.getTime() ?? null)) {
    activities.push({
      tenantId,
      leadId: data.id,
      userId: user.id,
      type: "FOLLOW_UP_SET",
      content: nextFollowUp ? nextFollowUp.toISOString() : null,
    });
  }

  try {
    const [updated] = await db.$transaction([
      db.lead.update({
        where: { id: data.id },
        data: {
          clientName: data.clientName,
          clientPhone: data.clientPhone || null,
          vehicleId: data.vehicleId,
          status: data.status,
          nextFollowUp,
        },
        select: leadSelect,
      }),
      db.activity.createMany({ data: activities }),
    ]);

    revalidatePath(LEADS_PATH);
    return { ok: true, data: toLeadDTO(updated) };
  } catch (error) {
    console.error("[updateLead]", error);
    return fail("No pudimos guardar los cambios.");
  }
}

/** Cambio de etapa en 1 toque desde la tarjeta o al arrastrar. Al cerrar (ganado/perdido) se limpia el seguimiento. */
export async function setLeadStatus(input: unknown): Promise<ActionResult<LeadDTO>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = leadStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { id, status } = parsed.data;
  const { db, tenantId, user } = ctx;

  const current = await db.lead.findUnique({ where: { id }, select: { status: true } });
  if (!current) return fail("No encontramos ese lead.");

  try {
    if (current.status === status) {
      const same = await db.lead.findUnique({ where: { id }, select: leadSelect });
      return same ? { ok: true, data: toLeadDTO(same) } : fail("No encontramos ese lead.");
    }

    const [updated] = await db.$transaction([
      db.lead.update({
        where: { id },
        data: isClosedStatus(status) ? { status, nextFollowUp: null } : { status },
        select: leadSelect,
      }),
      db.activity.create({
        data: { tenantId, leadId: id, userId: user.id, type: "STATUS_CHANGE", content: `${current.status}>${status}` },
      }),
    ]);

    revalidatePath(LEADS_PATH);
    return { ok: true, data: toLeadDTO(updated) };
  } catch (error) {
    console.error("[setLeadStatus]", error);
    return fail("No pudimos cambiar la etapa.");
  }
}

/** Nota rápida: queda en la línea de tiempo y se muestra como última nota en la tarjeta. */
export async function addLeadNote(input: unknown): Promise<ActionResult<{ activity: ActivityDTO }>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const parsed = leadNoteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nota inválida.");
  const { id, note } = parsed.data;
  const { db, tenantId, user } = ctx;

  const lead = await db.lead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) return fail("No encontramos ese lead.");

  try {
    const [activity] = await db.$transaction([
      db.activity.create({
        data: { tenantId, leadId: id, userId: user.id, type: "NOTE", content: note },
        select: { id: true, type: true, content: true, createdAt: true },
      }),
      db.lead.update({ where: { id }, data: { notes: note }, select: { id: true } }),
    ]);

    revalidatePath(LEADS_PATH);
    return {
      ok: true,
      data: {
        activity: {
          id: activity.id,
          type: activity.type,
          content: activity.content,
          createdAt: activity.createdAt.toISOString(),
          userName: user.name,
        },
      },
    };
  } catch (error) {
    console.error("[addLeadNote]", error);
    return fail("No pudimos guardar la nota.");
  }
}

/** Cuando el lead se cierra como ganado: marca el auto asociado como VENDIDO (sale del catálogo). */
export async function markVehicleSoldFromLead(input: unknown): Promise<ActionResult<{ vehicleId: string }>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const id = idSchema.safeParse(input);
  if (!id.success) return fail("Datos inválidos.");

  const lead = await ctx.db.lead.findUnique({ where: { id: id.data }, select: { vehicleId: true } });
  if (!lead?.vehicleId) return fail("Este lead no tiene un auto asociado.");

  try {
    await ctx.db.vehicle.update({ where: { id: lead.vehicleId }, data: { status: "SOLD" } });
  } catch (error) {
    console.error("[markVehicleSoldFromLead]", error);
    return fail("No pudimos marcar el auto como vendido.");
  }

  revalidateCatalog(ctx.tenant);
  revalidatePath(LEADS_PATH);
  return { ok: true, data: { vehicleId: lead.vehicleId } };
}

export async function deleteLead(input: unknown): Promise<ActionResult<null>> {
  const ctx = await authenticate();
  if (!ctx) return fail(SESSION_EXPIRED);

  const id = idSchema.safeParse(input);
  if (!id.success) return fail("Datos inválidos.");

  try {
    await ctx.db.lead.delete({ where: { id: id.data } });
  } catch (error) {
    console.error("[deleteLead]", error);
    return fail("No pudimos eliminar el lead.");
  }

  revalidatePath(LEADS_PATH);
  return { ok: true, data: null };
}
