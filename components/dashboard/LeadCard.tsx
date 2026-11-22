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
  today: "bg-amber-400 text-black",
  upcoming: "border border-neutral-200 dark:border-white/10 rounded-xl",
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
  const buttonBase = "flex h-11 items-center justify-center gap-2 border px-3 text-sm font-semibold active:scale-[0.98] transition rounded-xl bg-white dark:bg-white/5";

  return (
    <div
      className={`border bg-white dark:bg-neutral-900 ${
        overdue ? "border-red-600" : "border-neutral-200 dark:border-white/10"
      } rounded-xl`}
    >
      <button type="button" onClick={onOpen} className="block w-full space-y-2 p-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold leading-tight">{lead.clientName}</p>
          <span className="shrink-0 text-xs font-medium text-neutral-500">
            {now !== null ? timeAgo(lead.createdAt, now) : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lead.vehicle?.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lead.vehicle.thumbUrl} alt="" loading="lazy" className="h-10 w-14 shrink-0 object-cover" />
          ) : (
            <div className="h-10 w-14 shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          )}
          <p className="min-w-0 truncate text-sm font-medium">
            {lead.vehicle ? `${lead.vehicle.label} · ${lead.vehicle.year}` : "Sin auto asociado"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="border border-neutral-200 px-2 py-0.5 dark:border-white/10 rounded-xl">
            {LEAD_SOURCE_LABELS[lead.source]}
          </span>
          {closed ? (
            <span
              className={`px-2 py-0.5 ${
                lead.status === "WON" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
              }`}
            >
              {LEAD_STATUS_LABELS[lead.status].toUpperCase()}
            </span>
          ) : null}
          {followUp ? (
            <span className={`flex items-center gap-1 px-2 py-0.5 ${FOLLOW_UP_CLASSES[followUp.tone]}`}>
              {followUp.tone === "overdue" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {followUp.label}
            </span>
          ) : null}
        </div>

        {lead.notes ? <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{lead.notes}</p> : null}
      </button>

      <div className="space-y-2 border-t border-neutral-200 p-2 dark:border-white/10">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (lead.status === "NEW") onMove("CONTACTED");
            }}
            className="flex h-12 items-center justify-center gap-2 border border-emerald-700 bg-emerald-600 text-base font-semibold text-white active:scale-[0.98] transition rounded-xl"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        ) : lead.clientPhone ? (
          <a
            href={`tel:${lead.clientPhone.replace(/[^\d+]/g, "")}`}
            className={`${buttonBase} h-12 border-neutral-300 dark:border-white/20`}
          >
            Llamar · {lead.clientPhone}
          </a>
        ) : (
          <button type="button" onClick={onOpen} className={`${buttonBase} h-12 w-full border-dashed border-neutral-300 dark:border-white/20`}>
            Sin teléfono · esperá su mensaje o cargalo
          </button>
        )}

        {nextStatus ? (
          <button
            type="button"
            onClick={() => onMove(nextStatus)}
            className={`${buttonBase} w-full border-transparent bg-neutral-900 text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors`}
          >
            {NEXT_ACTION_LABELS[lead.status]} →
          </button>
        ) : null}

        {lead.status === "NEGOTIATING" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onMove("WON")} className={`${buttonBase} border-emerald-700 bg-emerald-600 text-white`}>
              Ganado
            </button>
            <button type="button" onClick={() => onMove("LOST")} className={`${buttonBase} border-neutral-200 dark:border-white/10`}>
              Perdido
            </button>
          </div>
        ) : null}

        {closed ? (
          <button type="button" onClick={() => onMove("CONTACTED")} className={`${buttonBase} w-full border-neutral-200 dark:border-white/10`}>
            Reabrir
          </button>
        ) : null}
      </div>
    </div>
  );
}
