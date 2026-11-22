"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";
import { BRAND_BUTTON_STYLE } from "@/components/catalog/brand-style";
import { registerLead } from "@/app/sites/lead-actions";

interface InquiryButtonProps {
  domain: string;
  vehicleId: string;
  vehicleTitle: string;
  priceLabel: string;
  canContact: boolean;
}

export function InquiryButton({ domain, vehicleId, vehicleTitle, priceLabel, canContact }: InquiryButtonProps) {
  const storageKey = `af:lead:${vehicleId}`;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleMainClick() {
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        window.location.assign(cached);
        return;
      }
    } catch {
      // Ignorado
    }
    setError(null);
    setOpen(true);
  }

  function submit(clientName: string) {
    setError(null);
    startTransition(async () => {
      const result = await registerLead({ domain, vehicleId, name: clientName, website: honeypot });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        sessionStorage.setItem(storageKey, result.data.whatsappUrl);
      } catch {
        // Ignorado
      }
      window.location.assign(result.data.whatsappUrl);
    });
  }

  if (!canContact) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5 text-center text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
        Esta agencia aún no habilitó el contacto directo por WhatsApp.
      </p>
    );
  }

  const mainButtonClass =
    "flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-xs transition-all hover:opacity-95 active:scale-[0.98]";

  return (
    <>
      <button
        type="button"
        onClick={handleMainClick}
        className={`hidden h-12 w-full lg:flex ${mainButtonClass}`}
        style={BRAND_BUTTON_STYLE}
      >
        <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
      </button>

      {/* Barra fija inferior en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-slate-200/80 bg-white/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#090A0F]/90">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Precio contado</p>
          <p className="font-display text-lg font-bold leading-tight text-slate-900 tabular-nums dark:text-white">
            {priceLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMainClick}
          className={`h-11 px-5 ${mainButtonClass}`}
          style={BRAND_BUTTON_STYLE}
        >
          <MessageCircle className="h-4 w-4" /> Consultar
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md space-y-5 rounded-t-3xl border border-slate-200/80 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6 dark:border-white/10 dark:bg-[#11131C]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="inquiry-title" className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Iniciar consulta
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{vehicleTitle}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tu nombre (opcional)
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoComplete="given-name"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30"
                placeholder="Ej: Martín"
              />
            </label>

            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              name="website"
            />

            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-400">
                {error}
              </p>
            ) : null}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={pending || name.trim().length < 2}
                onClick={() => submit(name.trim())}
                className={`h-11 w-full disabled:opacity-40 ${mainButtonClass}`}
                style={BRAND_BUTTON_STYLE}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Continuar a WhatsApp
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit("")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Omitir nombre e ir directo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
