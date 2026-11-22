import Link from "next/link";
import type { PublicVehicle } from "@/lib/catalog-types";
import { formatKm, formatPrice, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <li className="border-2 border-black px-2 py-1 dark:border-white">{children}</li>
  );
}

export function VehicleCard({ vehicle, priority = false }: { vehicle: PublicVehicle; priority?: boolean }) {
  const reserved = vehicle.status === "RESERVED";

  return (
    <li>
      <Link
        href={`/auto/${vehicle.id}`}
        className="group block border-2 border-black bg-white transition-transform active:translate-y-px dark:border-white dark:bg-neutral-950"
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
            <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-500">
              Sin foto
            </div>
          )}

          {reserved ? (
            <span className="absolute left-0 top-4 bg-amber-400 px-4 py-2 text-sm font-black tracking-widest text-black">
              RESERVADO
            </span>
          ) : null}

          {vehicle.isFeatured && !reserved ? (
            <span
              className="absolute left-0 top-4 px-3 py-1.5 text-xs font-black tracking-widest"
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
            >
              DESTACADO
            </span>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-lg font-black leading-tight">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="min-h-5 truncate text-sm text-neutral-600 dark:text-neutral-400">
              {vehicle.version ?? ""}
            </p>
          </div>

          <ul className="flex flex-wrap gap-2 text-xs font-bold">
            <Badge>{vehicle.year}</Badge>
            <Badge>{formatKm(vehicle.mileage)}</Badge>
            <Badge>{TRANSMISSION_LABELS[vehicle.transmission]}</Badge>
          </ul>

          <p className="text-2xl font-black tracking-tight">{formatPrice(vehicle.price, vehicle.currency)}</p>
        </div>
      </Link>
    </li>
  );
}
