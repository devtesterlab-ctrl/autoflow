"use client";

import { useState } from "react";
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

  const remaining = Math.max(0, price - downPayment);
  const percentage = price > 0 ? Math.round((downPayment / price) * 100) : 0;

  return (
    <section className="space-y-4 border border-neutral-200 p-4 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.04]" aria-labelledby="finance-title">
      <h2 id="finance-title" className="text-lg font-bold">
        Calculá tu anticipo
      </h2>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="down-payment" className="text-sm font-semibold">
            Cuánto entregás
          </label>
          <output htmlFor="down-payment" className="text-xl font-bold font-display">
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
          className="h-10 w-full cursor-pointer"
          style={{ accentColor: "var(--brand-primary)" }}
        />

        <ul className="grid grid-cols-4 gap-2">
          {QUICK_PERCENTAGES.map((value) => {
            const target = roundToStep((price * value) / 100);
            const selected = target === downPayment;
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDownPayment(target)}
                  className="h-11 w-full border border-neutral-300 text-sm font-semibold dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
                  style={selected ? BRAND_BUTTON_STYLE : undefined}
                >
                  {value}%
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-white/10 dark:bg-white/10">
        <div className="bg-white p-3 dark:bg-neutral-950">
          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Anticipo</dt>
          <dd className="text-base font-bold">{percentage}%</dd>
        </div>
        <div className="bg-white p-3 dark:bg-neutral-950">
          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Saldo a financiar
          </dt>
          <dd className="text-base font-bold">{formatPrice(remaining, currency)}</dd>
        </div>
      </dl>

      <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        Valores estimados, solo a modo de referencia y sin carácter de oferta. La financiación está sujeta a
        evaluación crediticia y a las condiciones vigentes. Consultá con la agencia por plazos, tasas y requisitos.
      </p>
    </section>
  );
}
