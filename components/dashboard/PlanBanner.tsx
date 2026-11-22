import { PLAN_LIMITS, type PlanUsage } from "@/lib/plan-config";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";

export function PlanBanner({ usage, agencyName }: { usage: PlanUsage; agencyName: string }) {
  const percent = Math.min(100, Math.round((usage.activeVehicles / usage.maxActiveVehicles) * 100));
  const nextLabel = usage.nextPlan ? PLAN_LIMITS[usage.nextPlan].label : null;

  const supportNumber = normalizeWhatsappNumber(process.env.NEXT_PUBLIC_UPGRADE_WHATSAPP);
  const paymentUrl = process.env.NEXT_PUBLIC_UPGRADE_PAYMENT_URL;
  const paymentHref = paymentUrl && paymentUrl.startsWith("https://") ? paymentUrl : null;

  const message = nextLabel
    ? `Hola! Quiero pasar la agencia "${agencyName}" del plan ${usage.label} al plan ${nextLabel}.`
    : `Hola! Necesito ampliar los límites del plan ${usage.label} de la agencia "${agencyName}".`;
  const whatsappHref = supportNumber ? buildWhatsappUrl(supportNumber, message) : null;

  const blocked = usage.atVehicleLimit;
  const warning = !blocked && usage.nearVehicleLimit;
  const remaining = usage.maxActiveVehicles - usage.activeVehicles;

  const tone = blocked
    ? "border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40"
    : warning
      ? "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40"
      : "border-slate-200/90 bg-white dark:border-white/10 dark:bg-[#11131C]";
  const barColor = blocked
    ? "bg-red-600"
    : warning
      ? "bg-amber-500"
      : "bg-slate-900 dark:bg-white";

  return (
    <section aria-label="Uso del plan" className={`space-y-3 rounded-2xl border p-4 shadow-2xs ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Plan {usage.label}
        </span>
        <span className="text-xs font-bold text-slate-800 tabular-nums dark:text-slate-200">
          {usage.activeVehicles} / {usage.maxActiveVehicles} unidades activas
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={usage.maxActiveVehicles}
        aria-valuenow={usage.activeVehicles}
        aria-label="Autos activos"
        className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
      >
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percent}%` }} />
      </div>

      {blocked ? (
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold leading-relaxed text-red-700 dark:text-red-300">
            Alcanzaste el límite de autos activos de tu plan. Pasá una unidad a Vendido/Preparación o ampliá tu plan para seguir publicando.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
              >
                {nextLabel ? `Ampliar a ${nextLabel} por WhatsApp` : "Contactar soporte por WhatsApp"}
              </a>
            ) : null}
            {paymentHref ? (
              <a
                href={paymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                Ver planes
              </a>
            ) : null}
            {!whatsappHref && !paymentHref ? (
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Contactá al soporte de AutoFlow para ampliar tu plan.
              </p>
            ) : null}
          </div>
        </div>
      ) : warning ? (
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Te {remaining === 1 ? "queda 1 cupo" : `quedan ${remaining} cupos`} disponible{remaining === 1 ? "" : "s"} en tu plan.
        </p>
      ) : null}
    </section>
  );
}
