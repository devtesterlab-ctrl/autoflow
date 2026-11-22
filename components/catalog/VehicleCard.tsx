import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicVehicle } from "@/lib/catalog-types";
import { formatKm, formatPrice, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";

export function VehicleCard({ vehicle, priority = false }: { vehicle: PublicVehicle; priority?: boolean }) {
  const reserved = vehicle.status === "RESERVED";

  return (
    <li>
      <Link
        href={`/auto/${vehicle.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-[#11131C] dark:hover:border-white/20"
      >
        {/* Imagen dominante 16:10 */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800/80">
          {vehicle.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.coverUrl}
              alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
                reserved ? "opacity-75 grayscale-[20%]" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
              Sin foto disponible
            </div>
          )}

          {reserved ? (
            <span className="absolute left-3 top-3 rounded-full bg-amber-400/95 px-3 py-1 text-[11px] font-bold tracking-wider text-slate-950 shadow-xs backdrop-blur-xs">
              RESERVADO
            </span>
          ) : null}

          {vehicle.isFeatured && !reserved ? (
            <span
              className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider shadow-xs"
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
            >
              DESTACADO
            </span>
          ) : null}
        </div>

        {/* Cuerpo limpio: Marca/Modelo -> Specs con puntos -> Precio */}
        <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200">
                {vehicle.brand} {vehicle.model}
              </h3>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700 group-hover:opacity-100 dark:group-hover:text-slate-200" />
            </div>

            {vehicle.version ? (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{vehicle.version}</p>
            ) : null}

            <p className="pt-0.5 text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
              <span>{vehicle.year}</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <span>{formatKm(vehicle.mileage)}</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <span>{TRANSMISSION_LABELS[vehicle.transmission]}</span>
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-white/5">
            <p className="font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
              {formatPrice(vehicle.price, vehicle.currency)}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}
