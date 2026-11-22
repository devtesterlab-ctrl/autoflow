"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageCircle, Phone, Trash2, X } from "lucide-react";
import { addLeadNote, createLead, deleteLead, getLeadActivities, updateLead } from "@/app/dashboard/leads/actions";
import { Segmented } from "@/components/ui/segmented";
import {
  isClosedStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_VALUES,
  MANUAL_SOURCE_OPTIONS,
  type ActivityDTO,
  type LeadDTO,
  type LeadStatusValue,
  type ManualSourceValue,
  type VehicleOption,
} from "@/lib/lead-types";
import { followUpPreset, formatDateTime, localInputToIso, timeAgo, toLocalInputValue } from "@/lib/lead-ui";
import { buildWhatsappUrl, phoneToWhatsappDigits } from "@/lib/whatsapp";

interface LeadDrawerProps {
  mode: "create" | "edit";
  lead: LeadDTO | null;
  vehicles: VehicleOption[];
  tenantName: string;
  now: number | null;
  onClose: () => void;
  onSaved: (lead: LeadDTO, previousStatus: LeadStatusValue | null) => void;
  onDeleted: (id: string) => void;
  onNoteAdded: (id: string, note: string) => void;
}

const INPUT_CLASS =
  "h-14 w-full border-2 border-black bg-transparent px-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30";

const STATUS_OPTIONS = LEAD_STATUS_VALUES.map((value) => ({ value, label: LEAD_STATUS_LABELS[value] }));

function describeActivity(activity: ActivityDTO): string {
  switch (activity.type) {
    case "STATUS_CHANGE": {
      const [from, to] = (activity.content ?? "").split(">") as LeadStatusValue[];
      return `Estado: ${LEAD_STATUS_LABELS[from] ?? from} → ${LEAD_STATUS_LABELS[to] ?? to}`;
    }
    case "FOLLOW_UP_SET":
      return activity.content ? `Próximo contacto: ${formatDateTime(activity.content)}` : "Seguimiento quitado";
    default:
      return activity.content ?? "Lead creado";
  }
}

export function LeadDrawer(props: LeadDrawerProps) {
  const { mode, lead, vehicles, tenantName, now, onClose, onSaved, onDeleted, onNoteAdded } = props;

  const [name, setName] = useState(lead?.clientName ?? "");
  const [phone, setPhone] = useState(lead?.clientPhone ?? "");
  const [vehicleId, setVehicleId] = useState(lead?.vehicle?.id ?? "");
  const [status, setStatus] = useState<LeadStatusValue>(lead?.status ?? "NEW");
  const [source, setSource] = useState<ManualSourceValue>("MANUAL");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(toLocalInputValue(lead?.nextFollowUp ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [activities, setActivities] = useState<ActivityDTO[] | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const leadId = lead?.id ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (mode !== "edit" || !leadId) return;
    let cancelled = false;
    void getLeadActivities(leadId).then((result) => {
      if (!cancelled) setActivities(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, leadId]);

  const closed = isClosedStatus(status);
  const digits = phoneToWhatsappDigits(phone);
  const whatsappUrl = digits
    ? buildWhatsappUrl(
        digits,
        `Hola ${name.split(" ")[0] || ""}! Te escribo de ${tenantName}${
          lead?.vehicle ? ` por el ${lead.vehicle.label} ${lead.vehicle.year}` : ""
        }.`,
      )
    : null;

  function save() {
    setErrors({});
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createLead({
              clientName: name,
              clientPhone: phone,
              vehicleId: vehicleId || null,
              source,
              status,
              notes,
              nextFollowUp: localInputToIso(followUp),
            })
          : await updateLead({
              id: leadId,
              clientName: name,
              clientPhone: phone,
              vehicleId: vehicleId || null,
              status,
              nextFollowUp: localInputToIso(followUp),
            });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }
      onSaved(result.data, lead?.status ?? null);
    });
  }

  async function submitNote() {
    if (!leadId || !noteDraft.trim()) return;
    setNoteBusy(true);
    setError(null);
    const result = await addLeadNote({ id: leadId, note: noteDraft });
    setNoteBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setActivities((previous) => [result.data.activity, ...(previous ?? [])]);
    onNoteAdded(leadId, result.data.activity.content ?? "");
    setNoteDraft("");
  }

  async function remove() {
    if (!leadId || !window.confirm(`¿Eliminar a ${lead?.clientName}? Se borra también su historial.`)) return;
    const result = await deleteLead(leadId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted(leadId);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Nuevo lead" : `Lead ${lead?.clientName}`}
      className="fixed inset-0 z-50 flex items-end bg-black/60 lg:items-stretch lg:justify-end"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] w-full flex-col border-2 border-black bg-white lg:max-h-none lg:w-[28rem] dark:border-white dark:bg-neutral-950">
        <div className="flex items-start justify-between gap-3 border-b-2 border-black p-4 dark:border-white">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{mode === "create" ? "Nuevo lead" : lead?.clientName}</h2>
            {mode === "edit" && lead ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {LEAD_SOURCE_LABELS[lead.source]}
                {now !== null ? ` · ${timeAgo(lead.createdAt, now)}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black dark:border-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {mode === "edit" && (whatsappUrl || phone) ? (
            <div className="grid grid-cols-2 gap-3">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 items-center justify-center gap-2 border-2 border-emerald-700 bg-emerald-600 font-extrabold text-white"
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              ) : (
                <span />
              )}
              {phone ? (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="flex h-14 items-center justify-center gap-2 border-2 border-black font-bold dark:border-white"
                >
                  <Phone className="h-5 w-5" /> Llamar
                </a>
              ) : null}
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="space-y-2">
              <label htmlFor="quick-note" className="text-sm font-semibold">
                Nota rápida
              </label>
              <div className="flex gap-2">
                <input
                  id="quick-note"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitNote();
                    }
                  }}
                  maxLength={500}
                  placeholder="Ej: quiere probarlo el sábado"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => void submitNote()}
                  disabled={noteBusy || !noteDraft.trim()}
                  className="flex h-14 shrink-0 items-center justify-center border-2 border-black bg-black px-4 font-bold text-white disabled:opacity-40 dark:border-white dark:bg-white dark:text-black"
                >
                  {noteBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Agregar"}
                </button>
              </div>
            </div>
          ) : null}

          <Segmented
            label="Etapa"
            value={status}
            options={STATUS_OPTIONS}
            columns={3}
            onChange={(value) => setStatus(value)}
          />

          {!closed ? (
            <div className="space-y-2">
              <label htmlFor="follow-up" className="text-sm font-semibold">
                Próximo contacto
              </label>
              <input
                id="follow-up"
                type="datetime-local"
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                className={INPUT_CLASS}
              />
              {errors.nextFollowUp ? <p className="text-sm font-semibold text-red-600">{errors.nextFollowUp}</p> : null}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Mañana", days: 1 },
                  { label: "En 3 días", days: 3 },
                  { label: "En 1 semana", days: 7 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFollowUp(followUpPreset(preset.days))}
                    className="h-11 border-2 border-black/40 px-3 text-sm font-bold dark:border-white/40"
                  >
                    {preset.label}
                  </button>
                ))}
                {followUp ? (
                  <button
                    type="button"
                    onClick={() => setFollowUp("")}
                    className="h-11 px-3 text-sm font-bold underline underline-offset-4"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-semibold">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className={INPUT_CLASS}
              placeholder="Juan Pérez"
            />
            {errors.clientName ? <span className="block text-sm font-semibold text-red-600">{errors.clientName}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">Teléfono / WhatsApp</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className={INPUT_CLASS}
              placeholder="11 5555 1234"
            />
            {errors.clientPhone ? <span className="block text-sm font-semibold text-red-600">{errors.clientPhone}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">Auto de interés</span>
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              className={`${INPUT_CLASS} bg-white dark:bg-neutral-950`}
            >
              <option value="">Sin auto asociado</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </select>
            {errors.vehicleId ? <span className="block text-sm font-semibold text-red-600">{errors.vehicleId}</span> : null}
          </label>

          {mode === "create" ? (
            <>
              <Segmented
                label="Cómo llegó"
                value={source}
                options={MANUAL_SOURCE_OPTIONS}
                onChange={(value) => setSource(value)}
              />
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Nota (opcional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full border-2 border-black bg-transparent p-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30"
                  placeholder="Busca algo hasta USD 20.000…"
                />
              </label>
            </>
          ) : (
            <section aria-labelledby="timeline-title" className="space-y-3">
              <h3 id="timeline-title" className="text-sm font-extrabold uppercase tracking-widest">
                Historial
              </h3>
              {activities === null ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Cargando…</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Sin actividad todavía.</p>
              ) : (
                <ol className="space-y-3 border-l-4 border-black pl-4 dark:border-white">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <p className="text-sm font-semibold">{describeActivity(activity)}</p>
                      <p className="text-xs text-neutral-500">
                        {now !== null ? timeAgo(activity.createdAt, now) : ""}
                        {activity.userName ? ` · ${activity.userName}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="flex h-11 items-center gap-2 text-sm font-bold text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Eliminar lead
            </button>
          ) : null}
        </div>

        <div className="space-y-2 border-t-2 border-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-white">
          {error ? (
            <p role="alert" className="text-sm font-bold text-red-600">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex h-14 w-full items-center justify-center gap-2 border-2 border-black bg-black text-lg font-extrabold text-white disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {mode === "create" ? "Guardar lead" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
