"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Share2, Trash2 } from "lucide-react";
import { deleteVehicle, setVehicleStatus } from "@/app/dashboard/vehicles/actions";
import { InstagramStoryGenerator, type StoryBranding } from "@/components/dashboard/InstagramStoryGenerator";
import {
  formatKm,
  formatPrice,
  STATUS_ACTIVE_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "@/lib/vehicle-ui";
import {
  STATUS_VALUES,
  type CurrencyValue,
  type FuelValue,
  type StatusValue,
  type TransmissionValue,
} from "@/lib/validators/vehicle";

export interface InventoryVehicle {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  price: number;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  status: StatusValue;
  isFeatured: boolean;
  coverUrl: string | null;
}

type Filter = "ALL" | StatusValue;

const FILTER_ORDER: Filter[] = ["ALL", "AVAILABLE", "RESERVED", "SOLD", "PREPARATION"];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function VehicleInventory({
  vehicles,
  branding,
}: {
  vehicles: InventoryVehicle[];
  branding: StoryBranding;
}) {
  const [items, setItems] = useState<InventoryVehicle[]>(vehicles);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [storyVehicle, setStoryVehicle] = useState<InventoryVehicle | null>(null);

  useEffect(() => setItems(vehicles), [vehicles]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { ALL: items.length, AVAILABLE: 0, RESERVED: 0, SOLD: 0, PREPARATION: 0 };
    for (const item of items) result[item.status] += 1;
    return result;
  }, [items]);

  const visible = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) return false;
      if (tokens.length === 0) return true;
      const haystack = normalize(`${item.brand} ${item.model} ${item.version ?? ""} ${item.year}`);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [items, query, filter]);

  async function changeStatus(id: string, status: StatusValue) {
    const previous = items.find((item) => item.id === id)?.status;
    if (!previous || previous === status) return;

    setMessage(null);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));

    const result = await setVehicleStatus({ id, status });
    if (!result.ok) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status: previous } : item)));
      setMessage(result.error);
    }
  }

  async function removeVehicle(item: InventoryVehicle) {
    if (!window.confirm(`¿Eliminar ${item.brand} ${item.model} ${item.year}? Se borran también sus fotos.`)) return;

    setMessage(null);
    const result = await deleteVehicle(item.id);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Buscar marca, modelo o año"
            className="h-14 w-full border-2 border-black bg-transparent pl-12 pr-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30"
          />
        </label>
        <Link
          href="/dashboard/vehicles/new"
          className="flex h-14 shrink-0 items-center justify-center gap-2 border-2 border-black bg-black px-5 text-base font-extrabold text-white dark:border-white dark:bg-white dark:text-black"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nuevo auto</span>
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {FILTER_ORDER.map((value) => {
            const selected = filter === value;
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(value)}
                  className={`h-11 whitespace-nowrap border-2 px-4 text-sm font-bold ${
                    selected
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-black/30 dark:border-white/30"
                  }`}
                >
                  {value === "ALL" ? "Todos" : STATUS_LABELS[value]} · {counts[value]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {message ? (
        <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
          {message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-black/40 p-10 text-center dark:border-white/40">
          <p className="text-lg font-bold">
            {items.length === 0 ? "Todavía no cargaste autos." : "No hay autos con ese filtro."}
          </p>
          {items.length === 0 ? (
            <Link
              href="/dashboard/vehicles/new"
              className="mt-4 inline-flex h-14 items-center border-2 border-black bg-black px-6 font-extrabold text-white dark:border-white dark:bg-white dark:text-black"
            >
              Cargar mi primer auto
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-col border-2 border-black dark:border-white">
              <div className="relative aspect-[4/3] bg-neutral-200 dark:bg-neutral-800">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt={`${item.brand} ${item.model}`} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-500">Sin fotos</div>
                )}
                <span className={`absolute left-2 top-2 px-2 py-1 text-xs font-extrabold uppercase ${STATUS_BADGE_CLASSES[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
                {item.isFeatured ? (
                  <span className="absolute right-2 top-2 bg-black px-2 py-1 text-xs font-extrabold text-white dark:bg-white dark:text-black">
                    ★ DESTACADO
                  </span>
                ) : null}
              </div>

              <div className="flex-1 space-y-1 p-4">
                <p className="text-lg font-extrabold leading-tight">
                  {item.brand} {item.model}
                </p>
                {item.version ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.version}</p> : null}
                <p className="text-sm font-semibold">
                  {item.year} · {formatKm(item.mileage)}
                </p>
                <p className="pt-1 text-xl font-extrabold">{formatPrice(item.price, item.currency)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t-2 border-black p-3 dark:border-white">
                {STATUS_VALUES.map((status) => {
                  const active = item.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={active}
                      onClick={() => void changeStatus(item.id, status)}
                      className={`h-11 border-2 px-2 text-sm font-bold active:translate-y-px ${
                        active ? STATUS_ACTIVE_CLASSES[status] : "border-black/30 dark:border-white/30"
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 border-t-2 border-black dark:border-white">
                <Link
                  href={`/dashboard/vehicles/${item.id}/edit`}
                  className="flex h-12 items-center justify-center gap-2 border-r-2 border-black text-sm font-bold dark:border-white"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setStoryVehicle(item)}
                  className="flex h-12 items-center justify-center gap-2 border-r-2 border-black text-sm font-bold dark:border-white"
                >
                  <Share2 className="h-4 w-4" /> Historia
                </button>
                <button
                  type="button"
                  onClick={() => void removeVehicle(item)}
                  className="flex h-12 items-center justify-center gap-2 text-sm font-bold text-red-600"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {storyVehicle ? (
        <InstagramStoryGenerator
          vehicle={storyVehicle}
          branding={branding}
          onClose={() => setStoryVehicle(null)}
        />
      ) : null}
    </div>
  );
}
