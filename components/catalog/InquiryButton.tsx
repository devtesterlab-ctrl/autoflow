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
    // Si ya consultó por este auto en esta pestaña, no se registra otro lead: va directo a WhatsApp.
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        window.location.assign(cached);
        return;
      }
    } catch {
      // sessionStorage puede no estar disponible (modo privado): se sigue con el modal.
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
        // Ignorado: solo se pierde la protección contra doble registro.
      }
      window.location.assign(result.data.whatsappUrl);
    });
  }

  if (!canContact) {
    return (
      <p className="border border-dashed border-neutral-200 p-4 text-sm font-medium dark:border-white/10 rounded-2xl">
        Esta agencia todavía no habilitó el contacto por WhatsApp.
      </p>
    );
  }

  const mainButtonClass =
    "flex items-center justify-center gap-2 border text-base font-bold active:scale-[0.98] transition rounded-xl";

  return (
    <>
      <button
        type="button"
        onClick={handleMainClick}
        className={`hidden h-12 w-full lg:flex ${mainButtonClass}`}
        style={BRAND_BUTTON_STYLE}
      >
        <MessageCircle className="h-5 w-5" /> Consultar por este auto
      </button>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-neutral-200 bg-white/70 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden dark:border-white/10 dark:bg-neutral-950/60 backdrop-blur-xl">
        <p className="shrink-0 text-lg font-bold leading-tight">{priceLabel}</p>
        <button type="button" onClick={handleMainClick} className={`h-12 flex-1 ${mainButtonClass}`} style={BRAND_BUTTON_STYLE}>
          <MessageCircle className="h-5 w-5" /> Consultar
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md space-y-5 border border-neutral-200 bg-white/85 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 dark:border-white/10 dark:bg-neutral-950/80 shadow-2xl rounded-t-3xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="inquiry-title" className="text-xl font-bold font-display">
                  ¿Cómo te llamás?
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{vehicleTitle}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-300 dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-semibold">Tu nombre (opcional)</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoComplete="given-name"
                className="h-12 w-full border border-neutral-300 bg-white px-4 text-base outline-none focus:ring-4 focus:ring-neutral-900/10 dark:border-white/20 dark:focus:ring-white/10 dark:bg-white/5 focus:border-neutral-400 dark:focus:border-white/40 rounded-xl"
                placeholder="Para que la agencia te atienda mejor"
              />
            </label>

            {/* Honeypot: invisible para personas, los bots lo completan. */}
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
              <p role="alert" className="text-sm font-semibold text-red-600">
                {error}
              </p>
            ) : null}

            <div className="space-y-3">
              <button
                type="button"
                disabled={pending || name.trim().length < 2}
                onClick={() => submit(name.trim())}
                className={`h-12 w-full disabled:opacity-40 ${mainButtonClass}`}
                style={BRAND_BUTTON_STYLE}
              >
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                Enviar y abrir WhatsApp
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit("")}
                className="h-12 w-full border border-neutral-300 text-base font-semibold disabled:opacity-40 dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
              >
                Ir directo a WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
