import { isClosedStatus, type LeadDTO } from "@/lib/lead-types";

export function timeAgo(fromIso: string, now: number): string {
  const diff = Math.max(0, now - new Date(fromIso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  if (days < 60) return `hace ${Math.floor(days / 7)} sem`;
  return `hace ${Math.floor(days / 30)} meses`;
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

export type FollowUpTone = "overdue" | "today" | "upcoming";

export function describeFollowUp(iso: string, now: number): { label: string; tone: FollowUpTone } {
  const due = new Date(iso);
  if (due.getTime() < now) return { label: `Seguimiento vencido ${timeAgo(iso, now)}`, tone: "overdue" };
  if (due.toDateString() === new Date(now).toDateString()) {
    return { label: `Hoy ${timeFormatter.format(due)}`, tone: "today" };
  }
  if (due.toDateString() === new Date(now + 86_400_000).toDateString()) {
    return { label: `Mañana ${timeFormatter.format(due)}`, tone: "upcoming" };
  }
  return { label: formatDateTime(iso), tone: "upcoming" };
}

export function isOverdue(lead: LeadDTO, now: number): boolean {
  return !isClosedStatus(lead.status) && lead.nextFollowUp !== null && new Date(lead.nextFollowUp).getTime() < now;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO -> valor para <input type="datetime-local"> en hora local del navegador. */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> (hora local) -> ISO UTC para el servidor. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function followUpPreset(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(10, 0, 0, 0);
  return toLocalInputValue(date.toISOString());
}
