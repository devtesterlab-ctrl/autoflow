"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import type { LeadSummary } from "@/lib/lead-types";

const EMPTY: LeadSummary = { newCount: 0, overdueCount: 0, latest: null };
const LeadSummaryContext = createContext<LeadSummary>(EMPTY);

export function useLeadSummary(): LeadSummary {
  return useContext(LeadSummaryContext);
}

const POLL_MS = 45_000;
const TOAST_MS = 10_000;

/**
 * Consulta el resumen de leads cada 45 s (solo con la pestaña visible), actualiza los contadores del menú,
 * el título de la pestaña y muestra un aviso cuando entra un lead nuevo.
 */
export function LeadAlertsProvider({ initial, children }: { initial: LeadSummary; children: ReactNode }) {
  const router = useRouter();
  const [summary, setSummary] = useState<LeadSummary>(initial);
  const [toast, setToast] = useState<NonNullable<LeadSummary["latest"]> | null>(null);
  const lastSeen = useRef<number>(initial.latest ? Date.parse(initial.latest.createdAt) : Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/leads/summary", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as LeadSummary;
        if (cancelled) return;

        setSummary(next);
        if (next.latest) {
          const createdAt = Date.parse(next.latest.createdAt);
          // Solo avisa de leads más nuevos que el último visto (mover un lead de etapa no dispara el aviso).
          if (createdAt > lastSeen.current) {
            lastSeen.current = createdAt;
            setToast(next.latest);
          }
        }
      } catch {
        // Sin conexión: se reintenta en el próximo ciclo.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };

    const interval = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    document.title = document.title.replace(/^\(\d+\)\s/, "");
    if (summary.newCount > 0) document.title = `(${summary.newCount}) ${document.title}`;
  }, [summary.newCount]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <LeadSummaryContext.Provider value={summary}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-3 top-16 z-[70] mx-auto flex max-w-md items-start gap-3 border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#0a0a0a] dark:border-white dark:bg-neutral-950 dark:shadow-[6px_6px_0_0_#ffffff]"
        >
          <Bell className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Lead nuevo: {toast.clientName}</p>
            {toast.vehicleLabel ? (
              <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{toast.vehicleLabel}</p>
            ) : null}
            <Link
              href="/dashboard/leads"
              onClick={() => {
                setToast(null);
                router.refresh();
              }}
              className="mt-2 inline-flex h-10 items-center border-2 border-black bg-black px-4 text-sm font-bold text-white dark:border-white dark:bg-white dark:text-black"
            >
              Ver leads
            </Link>
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setToast(null)}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black dark:border-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </LeadSummaryContext.Provider>
  );
}
