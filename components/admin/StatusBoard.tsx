"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, RefreshCw, Upload } from "lucide-react";
import { refreshSystemStatusAction, sendTestEmailAction, testPhotoUploadAction } from "@/app/admin/actions";
import {
  LIGHT_LABEL,
  worstLight,
  type CheckResult,
  type Light,
  type SystemStatus,
  type UploadTestResult,
} from "@/lib/system-status-types";

export const DOT_CLASSES: Record<Light, string> = {
  ok: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]",
  warn: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.2)]",
  error: "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]",
  off: "bg-neutral-300 dark:bg-neutral-600",
};

const OVERALL_TEXT: Record<Light, string> = {
  ok: "Todo funciona correctamente",
  warn: "Funciona, con avisos para revisar",
  error: "Hay problemas que resolver",
  off: "Todavía no hay nada configurado",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

const CARD = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const BUTTON =
  "flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 dark:border-white/20 dark:bg-white/5";

function Dot({ status }: { status: Light }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${DOT_CLASSES[status]}`} />
      <span className="sr-only">{LIGHT_LABEL[status]}</span>
    </span>
  );
}

function Row({ item }: { item: CheckResult }) {
  return (
    <li className="space-y-1 border-t border-neutral-100 py-3 first:border-t-0 first:pt-0 last:pb-0 dark:border-white/5">
      <div className="flex items-start gap-3">
        <span className="mt-1.5">
          <Dot status={item.status} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.label}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.summary}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-neutral-500">{LIGHT_LABEL[item.status]}</span>
      </div>
      {item.hint && item.status !== "ok" ? (
        <p className="ml-6 rounded-lg bg-neutral-50 p-2.5 text-sm text-neutral-700 dark:bg-white/5 dark:text-neutral-300">{item.hint}</p>
      ) : null}
    </li>
  );
}

export function StatusBoard({ initial, adminEmail }: { initial: SystemStatus; adminEmail: string }) {
  const [status, setStatus] = useState<SystemStatus>(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadTestResult | null>(null);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [emailing, startEmail] = useTransition();

  function refresh() {
    setError(null);
    startRefresh(async () => {
      const result = await refreshSystemStatusAction();
      if (result.ok) setStatus(result.data);
      else setError(result.error);
    });
  }

  function testUpload() {
    setError(null);
    setUploadResult(null);
    startUpload(async () => {
      const result = await testPhotoUploadAction();
      if (result.ok) setUploadResult(result.data);
      else setError(result.error);
    });
  }

  function testEmail() {
    setError(null);
    setEmailResult(null);
    startEmail(async () => {
      const result = await sendTestEmailAction();
      if (result.ok) setEmailResult(result.data);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4`} aria-live="polite">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className={`h-5 w-5 shrink-0 rounded-full ${DOT_CLASSES[status.overall]}`} />
          <div>
            <p className="text-lg font-semibold">{OVERALL_TEXT[status.overall]}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Última verificación: {dateFormatter.format(new Date(status.checkedAt))}. El resultado se guarda 5 minutos para no
              gastar recursos.
            </p>
          </div>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className={BUTTON}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar ahora
        </button>
      </section>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className={`${CARD} space-y-4`} aria-labelledby="tests-title">
        <div>
          <h2 id="tests-title" className="text-lg font-semibold">
            Pruebas de punta a punta
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Se ejecutan solo cuando las pedís: la subida usa un archivo de 1 píxel que se borra al terminar, y el email sale a{" "}
            {adminEmail}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={testUpload} disabled={uploading} className={BUTTON}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Probar subida de fotos
          </button>
          <button type="button" onClick={testEmail} disabled={emailing} className={BUTTON}>
            {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Enviar email de prueba
          </button>
        </div>

        {uploadResult ? (
          <div className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10" role="status">
            <p className={`text-sm font-semibold ${uploadResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
              {uploadResult.ok ? "La subida de fotos funciona de punta a punta." : "La subida de fotos falla."}
            </p>
            <ul className="space-y-1 text-sm">
              {uploadResult.steps.map((step) => (
                <li key={step.label} className="flex items-start gap-2">
                  <Dot status={step.ok ? "ok" : "error"} />
                  <span>
                    <span className="font-medium">{step.label}:</span> {step.detail}
                  </span>
                </li>
              ))}
            </ul>
            {uploadResult.hint ? (
              <p className="rounded-lg bg-neutral-50 p-2.5 text-sm text-neutral-700 dark:bg-white/5 dark:text-neutral-300">{uploadResult.hint}</p>
            ) : null}
            {uploadResult.ok ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Si desde el navegador igual falla, el problema es el permiso CORS del bucket (ver el indicador de CORS arriba).
              </p>
            ) : null}
          </div>
        ) : null}

        {emailResult ? (
          <p role="status" className={`text-sm font-medium ${emailResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
            {emailResult.message}
          </p>
        ) : null}
      </section>

      {status.groups.map((group) => {
        const items = status.checks.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className={CARD} aria-label={group}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Dot status={worstLight(items.map((item) => item.status))} />
            </div>
            <ul>
              {items.map((item) => (
                <Row key={item.id} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
