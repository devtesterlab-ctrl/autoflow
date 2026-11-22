"use client";

import { AlertTriangle, Clock, MessageCircle } from "lucide-react";
import {
  isClosedStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  NEXT_ACTION_LABELS,
  NEXT_STATUS,
  type LeadDTO,
  type LeadStatusValue,
} from "@/lib/lead-types";
import { describeFollowUp, isOverdue, timeAgo } from "@/lib/lead-ui";
import { buildWhatsappUrl, phoneToWhatsappDigits } from "@/lib/whatsapp";

interface LeadCardProps {
  lead: LeadDTO;
  now: number | null;
  tenantName: string;
  onOpen: () => void;
  onMove: (status: LeadStatusValue) => void;
}

const FOLLOW_UP_CLASSES = {
  overdue: "bg-red-600 text-white",
  today: "bg-amber-400 text-slate-950",
  upcoming: "border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
} as const;

export function LeadCard({ lead, now, tenantName, onOpen, onMove }: LeadCardProps) {
  const closed = isClosedStatus(lead.status);
  const overdue = now !== null && isOverdue(lead, now);
  const followUp = now !== null && lead.nextFollowUp && !closed ? describeFollowUp(lead.nextFollowUp, now) : null;

  const digits = phoneToWhatsappDigits(lead.clientPhone);
  const firstName = lead.clientName.split(" ")[0];
  const message = lead.vehicle
    ? `Hola ${firstName}! Te escribo de ${tenantName} por el ${lead.vehicle.label} ${lead.vehicle.year} que consultaste.`
    : `Hola ${firstName}! Te escribo de ${tenantName} por tu consulta.`;
  const whatsappUrl = digits ? buildWhatsappUrl(digits, message) : null;

  const nextStatus = NEXT_STATUS[lead.status];
  const buttonBase = "flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold active:scale-[0.98] transition-all";

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-2xs transition-all hover:shadow-xs dark:bg-[#11131C] ${
        overdue ? "border-red-500/80" : "border-slate-200/90 dark:border-white/10"
      }`}
    >
      <button type="button" onClick={onOpen} className="block w-full space-y-2.5 p-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{lead.clientName}</p>
          <span className="shrink-0 text-[11px] font-medium text-slate-400 tabular-nums">
            {now !== null ? timeAgo(lead.createdAt, now) : ""}
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50/80 p-1.5 dark:bg-white/[0.03]">
          {lead.vehicle?.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lead.vehicle.thumbUrl} alt="" loading="lazy" className="h-9 w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="h-9 w-12 shrink-0 rounded-md bg-slate-200/70 dark:bg-white/10" />
          )}
          <p className="min-w-0 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
            {lead.vehicle ? `${lead.vehicle.label} · ${lead.vehicle.year}` : "Sin auto asociado"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {LEAD_SOURCE_LABELS[lead.source]}
          </span>
          {closed ? (
            <span
              className={`rounded-md px-2 py-0.5 ${
                lead.status === "WON"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              }`}
            >
              {LEAD_STATUS_LABELS[lead.status].toUpperCase()}
            </span>
          ) : null}
          {followUp ? (
            <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${FOLLOW_UP_CLASSES[followUp.tone]}`}>
              {followUp.tone === "overdue" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {followUp.label}
            </span>
          ) : null}
        </div>

        {lead.notes ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{lead.notes}</p>
        ) : null}
      </button>

      <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/40 p-2 dark:border-white/5 dark:bg-white/[0.01]">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (lead.status === "NEW") onMove("CONTACTED");
            }}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700 active:scale-[0.98]"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        ) : lead.clientPhone ? (
          <a
            href={`tel:${lead.clientPhone.replace(/[^\d+]/g, "")}`}
            className={`${buttonBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200`}
          >
            Llamar · {lead.clientPhone}
          </a>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className={`${buttonBase} w-full border-dashed border-slate-300 bg-transparent text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-white/15 dark:text-slate-400`}
          >
            Cargar teléfono
          </button>
        )}

        {nextStatus ? (
          <button
            type="button"
            onClick={() => onMove(nextStatus)}
            className={`${buttonBase} w-full border-transparent bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200`}
          >
            {NEXT_ACTION_LABELS[lead.status]} →
          </button>
        ) : null}

        {lead.status === "NEGOTIATING" ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onMove("WON")}
              className={`${buttonBase} border-transparent bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              Ganado
            </button>
            <button
              type="button"
              onClick={() => onMove("LOST")}
              className={`${buttonBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300`}
            >
              Perdido
            </button>
          </div>
        ) : null}

        {closed ? (
          <button
            type="button"
            onClick={() => onMove("CONTACTED")}
            className={`${buttonBase} w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300`}
          >
            Reabrir
          </button>
        ) : null}
      </div>
    </div>
  );
}
