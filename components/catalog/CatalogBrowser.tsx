"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { BRAND_BUTTON_STYLE } from "@/components/catalog/brand-style";
import { VehicleCard } from "@/components/catalog/VehicleCard";
import type { PublicVehicle } from "@/lib/catalog-types";
import type { CurrencyValue, TransmissionValue } from "@/lib/validators/vehicle";

type Sort = "featured" | "price-asc" | "price-desc" | "year-desc" | "km-asc";
type TransmissionFilter = "ALL" | TransmissionValue;
type CurrencyFilter = "ALL" | CurrencyValue;

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Destacados" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "year-desc", label: "Más nuevos" },
  { value: "km-asc", label: "Menos kilómetros" },
];

const TRANSMISSION_CHIPS: { value: TransmissionFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "MANUAL", label: "Manual" },
  { value: "AUTOMATIC", label: "Automática" },
];

const CURRENCY_CHIPS: { value: CurrencyFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "USD", label: "USD" },
  { value: "ARS", label: "Pesos" },
];

const CURRENCY_RANK: Record<CurrencyValue, number> = { USD: 0, ARS: 1 };

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function compareByPrice(a: PublicVehicle, b: PublicVehicle): number {
  if (a.currency !== b.currency) return CURRENCY_RANK[a.currency] - CURRENCY_RANK[b.currency];
  return a.price - b.price;
}

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/30";

function Chips<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={props.label} className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {props.label}
      </span>
      <div className="flex flex-wrap gap-2">
        {props.options.map((option) => {
          const selected = option.value === props.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => props.onChange(option.value)}
              className="h-9 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              style={selected ? BRAND_BUTTON_STYLE : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CatalogBrowser({ vehicles }: { vehicles: PublicVehicle[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [transmission, setTransmission] = useState<TransmissionFilter>("ALL");
  const [currency, setCurrency] = useState<CurrencyFilter>("ALL");
  const [sort, setSort] = useState<Sort>("featured");
  const [showFilters, setShowFilters] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.brand))).sort((a, b) => a.localeCompare(b, "es")),
    [vehicles],
  );
  const years = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.year))).sort((a, b) => b - a),
    [vehicles],
  );
  const hasBothCurrencies = useMemo(
    () => new Set(vehicles.map((vehicle) => vehicle.currency)).size > 1,
    [vehicles],
  );

  const activeFilters =
    (brand ? 1 : 0) +
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0) +
    (transmission !== "ALL" ? 1 : 0) +
    (currency !== "ALL" ? 1 : 0);

  const visible = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const from = yearFrom ? Number(yearFrom) : null;
    const to = yearTo ? Number(yearTo) : null;

    const filtered = vehicles.filter((vehicle) => {
      if (brand && vehicle.brand !== brand) return false;
      if (from !== null && vehicle.year < from) return false;
      if (to !== null && vehicle.year > to) return false;
      if (transmission !== "ALL" && vehicle.transmission !== transmission) return false;
      if (currency !== "ALL" && vehicle.currency !== currency) return false;
      if (tokens.length > 0) {
        const haystack = normalize(`${vehicle.brand} ${vehicle.model} ${vehicle.version ?? ""} ${vehicle.year}`);
        if (!tokens.every((token) => haystack.includes(token))) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort(compareByPrice);
        break;
      case "price-desc":
        sorted.sort((a, b) => compareByPrice(b, a) * (a.currency === b.currency ? 1 : -1));
        break;
      case "year-desc":
        sorted.sort((a, b) => b.year - a.year);
        break;
      case "km-asc":
        sorted.sort((a, b) => a.mileage - b.mileage);
        break;
      default:
        break;
    }
    return sorted;
  }, [vehicles, query, brand, yearFrom, yearTo, transmission, currency, sort]);

  function resetFilters() {
    setQuery("");
    setBrand("");
    setYearFrom("");
    setYearTo("");
    setTransmission("ALL");
    setCurrency("ALL");
    setSort("featured");
  }

  return (
    <section className="space-y-6" aria-label="Catálogo de vehículos">
      {/* Barra superior compacta: Buscador + Filtros + Orden */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar marca, modelo o año..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-white/10 dark:bg-[#11131C] dark:text-white dark:focus:border-white/30 dark:focus:ring-white/5"
            />
          </label>

          <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:flex sm:items-center">
            <button
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-100"
              style={showFilters || activeFilters > 0 ? BRAND_BUTTON_STYLE : undefined}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtros</span>
              {activeFilters > 0 ? (
                <span className="ml-0.5 rounded-full bg-black/15 px-1.5 py-0.5 text-xs tabular-nums">
                  {activeFilters}
                </span>
              ) : null}
            </button>

            <label className="relative sm:w-48">
              <span className="sr-only">Ordenar por</span>
              <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-800 shadow-2xs outline-none transition-colors focus:border-slate-400 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Pills rápidas de marca en desktop/mobile */}
        {brands.length > 1 ? (
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              aria-pressed={brand === ""}
              onClick={() => setBrand("")}
              className={`h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-all ${
                brand === ""
                  ? "border-transparent shadow-2xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-300"
              }`}
              style={brand === "" ? BRAND_BUTTON_STYLE : undefined}
            >
              Todas las marcas
            </button>
            {brands.map((item) => {
              const selected = brand === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setBrand(selected ? "" : item)}
                  className={`h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-all ${
                    selected
                      ? "border-transparent shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-300"
                  }`}
                  style={selected ? BRAND_BUTTON_STYLE : undefined}
                >
                  {item}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Panel desplegable de filtros avanzados */}
        {showFilters ? (
          <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#11131C]">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Marca
                </span>
                <select value={brand} onChange={(event) => setBrand(event.target.value)} className={SELECT_CLASS}>
                  <option value="">Todas</option>
                  {brands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Año desde
                </span>
                <select value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} className={SELECT_CLASS}>
                  <option value="">Cualquiera</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Año hasta
                </span>
                <select value={yearTo} onChange={(event) => setYearTo(event.target.value)} className={SELECT_CLASS}>
                  <option value="">Cualquiera</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-6">
              <Chips label="Transmisión" value={transmission} options={TRANSMISSION_CHIPS} onChange={setTransmission} />
              {hasBothCurrencies ? (
                <Chips label="Moneda" value={currency} options={CURRENCY_CHIPS} onChange={setCurrency} />
              ) : null}
            </div>

            {activeFilters > 0 || query ? (
              <div className="border-t border-slate-100 pt-3 dark:border-white/5">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restablecer filtros
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 tabular-nums dark:text-slate-400" aria-live="polite">
          {visible.length} {visible.length === 1 ? "unidad disponible" : "unidades disponibles"}
        </p>
        {(activeFilters > 0 || query) && !showFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {vehicles.length === 0 ? "Pronto vamos a cargar nuevas unidades." : "No encontramos autos con esos filtros."}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {vehicles.length > 0 ? "Probá ampliando los criterios de búsqueda." : "Volvé a visitarnos en unos días."}
          </p>
          {vehicles.length > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold shadow-2xs transition-opacity hover:opacity-90"
              style={BRAND_BUTTON_STYLE}
            >
              Ver todos los autos
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((vehicle, index) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < 3} />
          ))}
        </ul>
      )}
    </section>
  );
}
