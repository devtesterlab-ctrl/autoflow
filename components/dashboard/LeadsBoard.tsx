"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { markVehicleSoldFromLead, setLeadStatus } from "@/app/dashboard/leads/actions";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { LeadDrawer } from "@/components/dashboard/LeadDrawer";
import {
  BOARD_COLUMNS,
  isClosedStatus,
  type BoardColumn,
  type LeadDTO,
  type LeadStatusValue,
  type VehicleOption,
} from "@/lib/lead-types";
import { isOverdue } from "@/lib/lead-ui";

interface LeadsBoardProps {
  leads: LeadDTO[];
  vehicles: VehicleOption[];
  tenantName: string;
}

type DrawerState = { mode: "create" } | { mode: "edit"; leadId: string } | null;
type PromptState = { type: "won" | "close"; leadId: string } | null;

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function sortLeads(items: LeadDTO[], closed: boolean): LeadDTO[] {
  return [...items].sort((a, b) => {
    if (!closed) {
      if (a.nextFollowUp && b.nextFollowUp) return a.nextFollowUp.localeCompare(b.nextFollowUp);
      if (a.nextFollowUp) return -1;
      if (b.nextFollowUp) return 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function Sheet(props: { title: string; body?: string; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={props.title} className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-4 rounded-t-3xl border border-slate-200/80 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6 dark:border-white/10 dark:bg-[#11131C]">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{props.title}</h2>
        {props.body ? <p className="text-sm text-slate-600 dark:text-slate-300">{props.body}</p> : null}
        <div className="space-y-2.5 pt-1">{props.children}</div>
      </div>
    </div>
  );
}

export function LeadsBoard({ leads: initialLeads, vehicles, tenantName }: LeadsBoardProps) {
  const [leads, setLeads] = useState<LeadDTO[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(0);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState<BoardColumn["key"] | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const now = useNow();

  useEffect(() => setLeads(initialLeads), [initialLeads]);

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return leads;
    return leads.filter((lead) => {
      const haystack = normalize(`${lead.clientName} ${lead.clientPhone ?? ""} ${lead.vehicle?.label ?? ""}`);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [leads, query]);

  const columns = useMemo(
    () =>
      BOARD_COLUMNS.map((column) => ({
        column,
        items: sortLeads(
          filtered.filter((lead) => column.statuses.includes(lead.status)),
          column.key === "CLOSED",
        ),
      })),
    [filtered],
  );

  const overdueCount = now === null ? 0 : leads.filter((lead) => isOverdue(lead, now)).length;

  const goToTab = (index: number) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  async function moveLead(id: string, status: LeadStatusValue) {
    const lead = leads.find((candidate) => candidate.id === id);
    if (!lead || lead.status === status) return;

    setMessage(null);
    setLeads((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status, nextFollowUp: isClosedStatus(status) ? null : item.nextFollowUp } : item,
      ),
    );

    const result = await setLeadStatus({ id, status });
    if (!result.ok) {
      setLeads((current) => current.map((item) => (item.id === id ? lead : item)));
      setMessage(result.error);
      return;
    }

    setLeads((current) => current.map((item) => (item.id === id ? result.data : item)));
    if (status === "WON" && result.data.vehicle && result.data.vehicle.status !== "SOLD") {
      setPrompt({ type: "won", leadId: id });
    }
  }

  function handleMove(lead: LeadDTO, status: LeadStatusValue) {
    void moveLead(lead.id, status);
  }

  function handleDrop(column: BoardColumn, leadId: string) {
    setDragOver(null);
    const lead = leads.find((candidate) => candidate.id === leadId);
    if (!lead || column.statuses.includes(lead.status)) return;
    if (column.key === "CLOSED") {
      setPrompt({ type: "close", leadId });
      return;
    }
    void moveLead(leadId, column.statuses[0]);
  }

  function handleSaved(saved: LeadDTO, previousStatus: LeadStatusValue | null) {
    setLeads((current) =>
      current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
    setDrawer(null);

    const columnIndex = BOARD_COLUMNS.findIndex((column) => column.statuses.includes(saved.status));
    requestAnimationFrame(() => goToTab(Math.max(0, columnIndex)));

    if (saved.status === "WON" && previousStatus !== "WON" && saved.vehicle && saved.vehicle.status !== "SOLD") {
      setPrompt({ type: "won", leadId: saved.id });
    }
  }

  async function confirmSold() {
    const lead = leads.find((candidate) => candidate.id === prompt?.leadId);
    if (!lead) {
      setPrompt(null);
      return;
    }
    setBusy(true);
    const result = await markVehicleSoldFromLead(lead.id);
    setBusy(false);
    setPrompt(null);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setLeads((current) =>
      current.map((item) =>
        item.vehicle?.id === result.data.vehicleId ? { ...item, vehicle: { ...item.vehicle, status: "SOLD" } } : item,
      ),
    );
  }

  const editingLead = drawer?.mode === "edit" ? leads.find((lead) => lead.id === drawer.leadId) ?? null : null;
  const promptLead = prompt ? leads.find((lead) => lead.id === prompt.leadId) ?? null : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Seguimiento de consultas y oportunidades.</p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" /> Nuevo lead
        </button>
      </div>

      {overdueCount > 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {overdueCount === 1 ? "Tenés 1 seguimiento vencido." : `Tenés ${overdueCount} seguimientos vencidos.`}
        </p>
      ) : null}

      {message ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          {message}
        </p>
      ) : null}

      <label className="relative block">
        <span className="sr-only">Buscar leads</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, teléfono o vehículo..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-white/10 dark:bg-[#11131C] dark:text-white dark:focus:border-white/30"
        />
      </label>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-2">
          {columns.map(({ column, items }, index) => {
            const selected = tab === index;
            const hasOverdue = now !== null && items.some((lead) => isOverdue(lead, now));
            return (
              <li key={column.key}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => goToTab(index)}
                  className={`relative h-9 whitespace-nowrap rounded-full border px-4 text-xs font-semibold tabular-nums transition-all ${
                    selected
                      ? "border-transparent bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-300"
                  }`}
                >
                  {column.title} ({items.length})
                  {hasOverdue ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-950" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (track.clientWidth > 0) setTab(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:gap-3.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {columns.map(({ column, items }) => (
          <section
            key={column.key}
            aria-label={column.title}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(column.key);
            }}
            onDragLeave={() => setDragOver((current) => (current === column.key ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(column, event.dataTransfer.getData("text/plain"));
            }}
            className={`w-full shrink-0 snap-center space-y-3 px-0.5 transition-colors lg:min-h-[62dvh] lg:w-auto lg:min-w-0 lg:rounded-2xl lg:border lg:p-3 ${
              dragOver === column.key
                ? "lg:border-slate-400 lg:bg-slate-100/80 dark:lg:border-white/25 dark:lg:bg-white/5"
                : "lg:border-slate-200/80 lg:bg-slate-100/40 dark:lg:border-white/10 dark:lg:bg-white/[0.02]"
            }`}
          >
            <header className="hidden items-center justify-between px-1 lg:flex">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {column.title}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 shadow-2xs tabular-nums dark:bg-white/10 dark:text-slate-200">
                {items.length}
              </span>
            </header>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs font-medium text-slate-400 dark:border-white/10 dark:bg-transparent">
                Sin leads en esta etapa
              </div>
            ) : (
              <ul className="space-y-2.5">
                {items.map((lead) => (
                  <li
                    key={lead.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", lead.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragOver(null)}
                  >
                    <LeadCard
                      lead={lead}
                      now={now}
                      tenantName={tenantName}
                      onOpen={() => setDrawer({ mode: "edit", leadId: lead.id })}
                      onMove={(status) => handleMove(lead, status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {drawer && (drawer.mode === "create" || editingLead) ? (
        <LeadDrawer
          key={drawer.mode === "edit" ? drawer.leadId : "new"}
          mode={drawer.mode}
          lead={editingLead}
          vehicles={vehicles}
          tenantName={tenantName}
          now={now}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
          onDeleted={(id) => {
            setLeads((current) => current.filter((lead) => lead.id !== id));
            setDrawer(null);
          }}
          onNoteAdded={(id, note) =>
            setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, notes: note } : lead)))
          }
        />
      ) : null}

      {prompt?.type === "won" && promptLead?.vehicle ? (
        <Sheet
          title="¡Venta cerrada!"
          body={`¿Marcamos el ${promptLead.vehicle.label} ${promptLead.vehicle.year} como VENDIDO? Sale del catálogo público al instante.`}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmSold()}
            className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            Sí, marcar como vendido
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPrompt(null)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            No, dejarlo como está
          </button>
        </Sheet>
      ) : null}

      {prompt?.type === "close" && promptLead ? (
        <Sheet title="¿Cómo cerró?" body={`${promptLead.clientName}${promptLead.vehicle ? ` · ${promptLead.vehicle.label}` : ""}`}>
          <button
            type="button"
            onClick={() => {
              setPrompt(null);
              void moveLead(promptLead.id, "WON");
            }}
            className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700"
          >
            Ganado
          </button>
          <button
            type="button"
            onClick={() => {
              setPrompt(null);
              void moveLead(promptLead.id, "LOST");
            }}
            className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            Perdido
          </button>
          <button
            type="button"
            onClick={() => setPrompt(null)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            Cancelar
          </button>
        </Sheet>
      ) : null}
    </div>
  );
}
