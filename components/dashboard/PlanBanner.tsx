import { PLAN_LIMITS, type PlanUsage } from "@/lib/plan-config";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";

/**
 * Uso del plan + aviso de límite. Variables de entorno (opcionales):
 *  - NEXT_PUBLIC_UPGRADE_WHATSAPP: WhatsApp de ventas de AutoFlow (formato internacional)
 *  - NEXT_PUBLIC_UPGRADE_PAYMENT_URL: link de pago / checkout (https)
 */
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
    ? "border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800"
    : warning
      ? "border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700"
      : "border-neutral-200 dark:border-white/10";
  const barColor = blocked ? "bg-red-600" : warning ? "bg-amber-500" : "bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors";

  return (
    <section aria-label="Uso del plan" className={`space-y-3 border p-4 ${tone} rounded-2xl`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wider">Plan {usage.label}</p>
        <p className="text-sm font-semibold">
          {usage.activeVehicles} / {usage.maxActiveVehicles} autos activos
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={usage.maxActiveVehicles}
        aria-valuenow={usage.activeVehicles}
        aria-label="Autos activos"
        className="h-2.5 overflow-hidden rounded-full border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-800"
      >
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>

      {blocked ? (
        <div className="space-y-3">
          <p className="font-semibold text-red-700 dark:text-red-300">
            Llegaste al límite de autos activos de tu plan. No podés publicar más hasta liberar lugar
            (pasando un auto a Vendido o En preparación) o ampliar el plan.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center border border-emerald-700 bg-emerald-600 px-5 font-semibold text-white rounded-xl"
              >
                {nextLabel ? `Pedir upgrade a ${nextLabel} por WhatsApp` : "Hablar con ventas por WhatsApp"}
              </a>
            ) : null}
            {paymentHref ? (
              <a
                href={paymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center border border-transparent bg-neutral-900 px-5 font-semibold text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
              >
                Ver planes y pagar
              </a>
            ) : null}
            {!whatsappHref && !paymentHref ? (
              <p className="text-sm font-medium">Escribile al soporte de AutoFlow para ampliar tu plan.</p>
            ) : null}
          </div>
        </div>
      ) : warning ? (
        <p className="text-sm font-medium">
          Te {remaining === 1 ? "queda 1 lugar" : `quedan ${remaining} lugares`} para publicar autos.
        </p>
      ) : null}
    </section>
  );
}
