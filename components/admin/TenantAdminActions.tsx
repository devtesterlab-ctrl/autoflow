"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setTenantActive, setTenantCustomDomain, setTenantPlan } from "@/app/admin/actions";
import { canUseCustomDomain, PLAN_LIMITS, type PlanValue } from "@/lib/plan-config";

interface TenantAdminActionsProps {
  tenantId: string;
  plan: PlanValue;
  isActive: boolean;
  customDomain: string | null;
  isSelf: boolean;
}

type Message = { type: "ok" | "error"; text: string } | null;

const INPUT_CLASS =
  "h-12 w-full border-2 border-black bg-white px-3 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:bg-neutral-950";

export function TenantAdminActions({ tenantId, plan, isActive, customDomain, isSelf }: TenantAdminActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanValue>(plan);
  const [domain, setDomain] = useState(customDomain ?? "");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "No se pudo completar la acción." });
        return;
      }
      setMessage({ type: "ok", text: success });
      router.refresh();
    });
  }

  function changePlan() {
    if (selectedPlan === plan) return;
    const downgradeNote = canUseCustomDomain(plan) && !canUseCustomDomain(selectedPlan) && customDomain
      ? " Se le va a quitar el dominio propio."
      : "";
    if (!window.confirm(`¿Cambiar el plan de ${PLAN_LIMITS[plan].label} a ${PLAN_LIMITS[selectedPlan].label}?${downgradeNote}`)) return;
    run(() => setTenantPlan({ tenantId, plan: selectedPlan }), "Plan actualizado.");
  }

  function toggleActive() {
    const next = !isActive;
    const text = next
      ? "¿Reactivar esta agencia?"
      : "¿Suspender esta agencia? Su equipo no va a poder ingresar y su catálogo público deja de verse.";
    if (!window.confirm(text)) return;
    run(() => setTenantActive({ tenantId, active: next }), next ? "Agencia reactivada." : "Agencia suspendida.");
  }

  function saveDomain() {
    run(() => setTenantCustomDomain({ tenantId, domain: domain.trim() ? domain.trim() : null }), "Dominio actualizado.");
  }

  return (
    <section className="space-y-6 border-2 border-black p-4 dark:border-white" aria-labelledby="admin-actions">
      <h2 id="admin-actions" className="text-xl font-extrabold">
        Acciones
      </h2>

      <div className="space-y-2">
        <label htmlFor="plan-select" className="text-sm font-semibold">
          Plan
        </label>
        <div className="flex gap-2">
          <select id="plan-select" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanValue)} className={INPUT_CLASS}>
            {(Object.keys(PLAN_LIMITS) as PlanValue[]).map((value) => (
              <option key={value} value={value}>
                {PLAN_LIMITS[value].label} · {PLAN_LIMITS[value].maxActiveVehicles} autos · {PLAN_LIMITS[value].maxUsers} usuario(s)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={changePlan}
            disabled={pending || selectedPlan === plan}
            className="h-12 shrink-0 border-2 border-black bg-black px-5 font-bold text-white disabled:opacity-40 dark:border-white dark:bg-white dark:text-black"
          >
            Cambiar
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Si la agencia ya tiene más autos activos que el límite del nuevo plan, los conserva; solo no puede publicar más.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="domain-input" className="text-sm font-semibold">
          Dominio propio
        </label>
        <div className="flex gap-2">
          <input
            id="domain-input"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            disabled={!canUseCustomDomain(plan)}
            placeholder={canUseCustomDomain(plan) ? "www.miagencia.com" : "El plan no lo incluye"}
            autoCapitalize="none"
            spellCheck={false}
            className={`${INPUT_CLASS} disabled:opacity-50`}
          />
          <button
            type="button"
            onClick={saveDomain}
            disabled={pending || !canUseCustomDomain(plan) || domain.trim() === (customDomain ?? "")}
            className="h-12 shrink-0 border-2 border-black px-5 font-bold disabled:opacity-40 dark:border-white"
          >
            Guardar
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Dejalo vacío y guardá para quitarlo. El DNS del dominio hay que apuntarlo aparte (ver guía de deploy).
        </p>
      </div>

      <div className="space-y-2 border-t-2 border-black/20 pt-4 dark:border-white/20">
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending || (isActive && isSelf)}
          className={`flex h-12 items-center gap-2 border-2 px-5 font-bold disabled:opacity-40 ${
            isActive ? "border-red-600 text-red-600" : "border-emerald-700 bg-emerald-600 text-white"
          }`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isActive ? "Suspender agencia" : "Reactivar agencia"}
        </button>
        {isActive && isSelf ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Esta es tu propia agencia: no se puede suspender desde acá.</p>
        ) : null}
      </div>

      {message ? (
        <p role={message.type === "error" ? "alert" : "status"} className={`text-sm font-bold ${message.type === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
