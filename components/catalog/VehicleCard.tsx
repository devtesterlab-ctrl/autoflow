import Link from "next/link";
import type { PublicVehicle } from "@/lib/catalog-types";
import { formatKm, formatPrice, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">{children}</li>
  );
}

export function VehicleCard({ vehicle, priority = false }: { vehicle: PublicVehicle; priority?: boolean }) {
  const reserved = vehicle.status === "RESERVED";

  return (
    <li>
      <Link
        href={`/auto/${vehicle.id}`}
        className="group block overflow-hidden border border-neutral-200 bg-white transition-transform active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 transition rounded-2xl shadow-sm"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-800">
          {vehicle.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.coverUrl}
              alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                reserved ? "opacity-75" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-neutral-500">
              Sin foto
            </div>
          )}

          {reserved ? (
            <span className="absolute left-3 top-3 bg-amber-400 px-4 py-2 text-sm font-bold tracking-wider text-black rounded-full">
              RESERVADO
            </span>
          ) : null}

          {vehicle.isFeatured && !reserved ? (
            <span
              className="absolute left-3 top-3 px-3 py-1.5 text-xs font-bold tracking-wider rounded-full"
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
            >
              DESTACADO
            </span>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-lg font-bold leading-tight">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="min-h-5 truncate text-sm text-neutral-600 dark:text-neutral-400">
              {vehicle.version ?? ""}
            </p>
          </div>

          <ul className="flex flex-wrap gap-2 text-xs font-semibold">
            <Badge>{vehicle.year}</Badge>
            <Badge>{formatKm(vehicle.mileage)}</Badge>
            <Badge>{TRANSMISSION_LABELS[vehicle.transmission]}</Badge>
          </ul>

          <p className="text-2xl font-bold tracking-tight font-display">{formatPrice(vehicle.price, vehicle.currency)}</p>
        </div>
      </Link>
    </li>
  );
}
