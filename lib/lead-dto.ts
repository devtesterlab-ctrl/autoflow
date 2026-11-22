import "server-only";
import type { Prisma } from "@prisma/client";
import type { LeadDTO } from "@/lib/lead-types";

export const leadSelect = {
  id: true,
  clientName: true,
  clientPhone: true,
  source: true,
  status: true,
  notes: true,
  nextFollowUp: true,
  createdAt: true,
  vehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
      version: true,
      year: true,
      status: true,
      images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.LeadSelect;

type LeadRow = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export function toLeadDTO(row: LeadRow): LeadDTO {
  return {
    id: row.id,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    source: row.source,
    status: row.status,
    notes: row.notes,
    nextFollowUp: row.nextFollowUp ? row.nextFollowUp.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    vehicle: row.vehicle
      ? {
          id: row.vehicle.id,
          label: [row.vehicle.brand, row.vehicle.model, row.vehicle.version].filter(Boolean).join(" "),
          year: row.vehicle.year,
          status: row.vehicle.status,
          thumbUrl: row.vehicle.images[0]?.url ?? null,
        }
      : null,
  };
}
