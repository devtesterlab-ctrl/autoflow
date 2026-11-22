"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
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

/** Sin cotización no se pueden comparar USD y pesos: al ordenar por precio se agrupa por moneda (USD primero). */
const CURRENCY_RANK: Record<CurrencyValue, number> = { USD: 0, ARS: 1 };

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function compareByPrice(a: PublicVehicle, b: PublicVehicle): number {
  if (a.currency !== b.currency) return CURRENCY_RANK[a.currency] - CURRENCY_RANK[b.currency];
  return a.price - b.price;
}

const SELECT_CLASS =
  "h-12 w-full border-2 border-black bg-white px-3 text-base dark:border-white dark:bg-neutral-950";

function Chips<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={props.label} className="space-y-2">
      <span className="block text-sm font-bold">{props.label}</span>
      <div className="flex flex-wrap gap-2">
        {props.options.map((option) => {
          const selected = option.value === props.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => props.onChange(option.value)}
              className="h-11 border-2 border-black px-4 text-sm font-bold dark:border-white"
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
    <section className="space-y-4" aria-label="Catálogo de vehículos">
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar marca, modelo o año"
            className="h-14 w-full border-2 border-black bg-transparent pl-12 pr-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30"
          />
        </label>

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((value) => !value)}
            className="flex h-12 items-center gap-2 border-2 border-black px-4 text-sm font-bold dark:border-white"
            style={showFilters || activeFilters > 0 ? BRAND_BUTTON_STYLE : undefined}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          <label>
            <span className="sr-only">Ordenar por</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={SELECT_CLASS}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showFilters ? (
          <div className="space-y-5 border-2 border-black p-4 dark:border-white">
            <label className="block space-y-2">
              <span className="block text-sm font-bold">Marca</span>
              <select value={brand} onChange={(event) => setBrand(event.target.value)} className={SELECT_CLASS}>
                <option value="">Todas</option>
                {brands.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="block text-sm font-bold">Año desde</span>
                <select value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} className={SELECT_CLASS}>
                  <option value="">Cualquiera</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="block text-sm font-bold">Año hasta</span>
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

            <Chips label="Transmisión" value={transmission} options={TRANSMISSION_CHIPS} onChange={setTransmission} />
            {hasBothCurrencies ? (
              <Chips label="Moneda" value={currency} options={CURRENCY_CHIPS} onChange={setCurrency} />
            ) : null}

            {activeFilters > 0 || query ? (
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-11 items-center gap-2 text-sm font-bold underline underline-offset-4"
              >
                <X className="h-4 w-4" /> Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400" aria-live="polite">
        {visible.length} {visible.length === 1 ? "auto" : "autos"}
      </p>

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-black/40 p-10 text-center dark:border-white/40">
          <p className="text-lg font-bold">
            {vehicles.length === 0 ? "Pronto vamos a cargar nuevas unidades." : "No encontramos autos con esos filtros."}
          </p>
          {vehicles.length > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 h-12 border-2 px-6 font-bold"
              style={BRAND_BUTTON_STYLE}
            >
              Ver todos los autos
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((vehicle, index) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < 2} />
          ))}
        </ul>
      )}
    </section>
  );
}
