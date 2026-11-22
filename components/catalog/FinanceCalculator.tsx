"use client";

import { useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import { BRAND_BUTTON_STYLE } from "@/components/catalog/brand-style";
import { formatPrice } from "@/lib/vehicle-ui";
import type { CurrencyValue } from "@/lib/validators/vehicle";

interface FinanceCalculatorProps {
  price: number;
  currency: CurrencyValue;
}

const QUICK_PERCENTAGES = [20, 30, 40, 50] as const;

export function FinanceCalculator({ price, currency }: FinanceCalculatorProps) {
  const step = currency === "USD" ? 100 : 50_000;
  const max = Math.max(step, Math.floor((price * 0.9) / step) * step);
  const roundToStep = (value: number) => Math.min(max, Math.max(0, Math.round(value / step) * step));

  const [downPayment, setDownPayment] = useState(() => roundToStep(price * 0.3));
  const [expanded, setExpanded] = useState(true);

  const remaining = Math.max(0, price - downPayment);
  const percentage = price > 0 ? Math.round((downPayment / price) * 100) : 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-white/10 dark:bg-[#11131C]"
      aria-labelledby="finance-title"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <Calculator className="h-4 w-4" />
          </div>
          <h2 id="finance-title" className="font-display text-base font-bold text-slate-900 dark:text-white">
            Simulador de anticipo
          </h2>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6 dark:border-white/5">
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="down-payment" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Entrega inicial
              </label>
              <output htmlFor="down-payment" className="font-display text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                {formatPrice(downPayment, currency)}
              </output>
            </div>

            <input
              id="down-payment"
              type="range"
              min={0}
              max={max}
              step={step}
              value={downPayment}
              onChange={(event) => setDownPayment(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-white/10"
              style={{ accentColor: "var(--brand-primary)" }}
            />

            <ul className="grid grid-cols-4 gap-2 pt-1">
              {QUICK_PERCENTAGES.map((value) => {
                const target = roundToStep((price * value) / 100);
                const selected = target === downPayment;
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDownPayment(target)}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 tabular-nums transition-all hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      style={selected ? BRAND_BUTTON_STYLE : undefined}
                    >
                      {value}%
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
              <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Anticipo</dt>
              <dd className="mt-0.5 text-base font-bold text-slate-900 tabular-nums dark:text-white">{percentage}%</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
              <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Saldo restante</dt>
              <dd className="mt-0.5 text-base font-bold text-slate-900 tabular-nums dark:text-white">
                {formatPrice(remaining, currency)}
              </dd>
            </div>
          </dl>

          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Cálculo orientativo sin carácter de oferta. Sujeto a evaluación crediticia y condiciones vigentes de la agencia.
          </p>
        </div>
      ) : null}
    </section>
  );
}
