"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DOT_CLASSES } from "@/components/admin/StatusBoard";
import { LIGHT_LABEL, worstLight, type Light, type SystemStatus } from "@/lib/system-status-types";

/** Semáforo compacto para el inicio del panel. Se carga después de mostrar la página y usa el resultado guardado. */
export function StatusSummary() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/status", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<SystemStatus>) : Promise.reject(new Error("status"))))
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = status
    ? status.groups.map((group) => ({
        group,
        light: worstLight(status.checks.filter((item) => item.group === group).map((item) => item.status)),
      }))
    : [];

  return (
    <Link
      href="/admin/estado"
      aria-label="Ver el estado del sistema"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-semibold">Estado del sistema</span>
        {status
          ? groups.map(({ group, light }) => (
              <span key={group} className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[light as Light]}`} />
                {group}
                <span className="sr-only">: {LIGHT_LABEL[light]}</span>
              </span>
            ))
          : failed
            ? <span className="text-sm text-neutral-500">No se pudo cargar</span>
            : ["Plataforma", "Datos", "Imágenes", "Emails", "Seguridad"].map((group) => (
                <span key={group} className="inline-flex items-center gap-2 text-sm text-neutral-400">
                  <span aria-hidden="true" className="h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  {group}
                </span>
              ))}
      </div>
      <span className="text-sm font-medium underline underline-offset-4">Ver detalle</span>
    </Link>
  );
}
