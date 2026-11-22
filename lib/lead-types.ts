import type { StatusValue } from "@/lib/validators/vehicle";

export const LEAD_STATUS_VALUES = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "NEGOTIATING", "WON", "LOST"] as const;
export const LEAD_SOURCE_VALUES = ["WHATSAPP_CATALOG", "MANUAL", "INSTAGRAM"] as const;
export const MANUAL_SOURCE_VALUES = ["MANUAL", "INSTAGRAM"] as const;
export const ACTIVITY_TYPE_VALUES = ["CREATED", "NOTE", "STATUS_CHANGE", "FOLLOW_UP_SET"] as const;

export type LeadStatusValue = (typeof LEAD_STATUS_VALUES)[number];
export type LeadSourceValue = (typeof LEAD_SOURCE_VALUES)[number];
export type ManualSourceValue = (typeof MANUAL_SOURCE_VALUES)[number];
export type ActivityTypeValue = (typeof ACTIVITY_TYPE_VALUES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  VISIT_SCHEDULED: "Visita / Prueba",
  NEGOTIATING: "Negociando / Seña",
  WON: "Ganado",
  LOST: "Perdido",
};

export const LEAD_SOURCE_LABELS: Record<LeadSourceValue, string> = {
  WHATSAPP_CATALOG: "Catálogo web",
  MANUAL: "Cargado a mano",
  INSTAGRAM: "Instagram",
};

export const MANUAL_SOURCE_OPTIONS: { value: ManualSourceValue; label: string }[] = [
  { value: "MANUAL", label: "Entró al local / otro" },
  { value: "INSTAGRAM", label: "Instagram" },
];

export interface BoardColumn {
  key: "NEW" | "CONTACTED" | "VISIT_SCHEDULED" | "NEGOTIATING" | "CLOSED";
  title: string;
  statuses: LeadStatusValue[];
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { key: "NEW", title: "Nuevos", statuses: ["NEW"] },
  { key: "CONTACTED", title: "Contactados", statuses: ["CONTACTED"] },
  { key: "VISIT_SCHEDULED", title: "Visita / Prueba", statuses: ["VISIT_SCHEDULED"] },
  { key: "NEGOTIATING", title: "Negociando / Seña", statuses: ["NEGOTIATING"] },
  { key: "CLOSED", title: "Cerrados / Perdidos", statuses: ["WON", "LOST"] },
];

export const NEXT_STATUS: Partial<Record<LeadStatusValue, LeadStatusValue>> = {
  NEW: "CONTACTED",
  CONTACTED: "VISIT_SCHEDULED",
  VISIT_SCHEDULED: "NEGOTIATING",
};

export const NEXT_ACTION_LABELS: Partial<Record<LeadStatusValue, string>> = {
  NEW: "Marcar contactado",
  CONTACTED: "Agendar visita",
  VISIT_SCHEDULED: "Pasar a negociación",
};

export const isClosedStatus = (status: LeadStatusValue): boolean => status === "WON" || status === "LOST";

export interface LeadVehicleDTO {
  id: string;
  label: string;
  year: number;
  status: StatusValue;
  thumbUrl: string | null;
}

export interface LeadDTO {
  id: string;
  clientName: string;
  clientPhone: string | null;
  source: LeadSourceValue;
  status: LeadStatusValue;
  notes: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  vehicle: LeadVehicleDTO | null;
}

export interface ActivityDTO {
  id: string;
  type: ActivityTypeValue;
  content: string | null;
  createdAt: string;
  userName: string | null;
}

export interface VehicleOption {
  id: string;
  label: string;
}

export interface LeadSummary {
  newCount: number;
  overdueCount: number;
  latest: { id: string; clientName: string; vehicleLabel: string | null; createdAt: string } | null;
}
