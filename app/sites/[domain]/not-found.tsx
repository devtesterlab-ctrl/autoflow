import Link from "next/link";
import { CarFront } from "lucide-react";

export default function SiteNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-2xs dark:border-white/10 dark:bg-white/5">
        <CarFront className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        No encontramos este vehículo
      </h1>
      <p className="text-sm text-slate-600 sm:text-base dark:text-slate-400">
        Puede que ya se haya vendido o que el enlace esté incompleto.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold shadow-2xs transition-opacity hover:opacity-90"
        style={{
          backgroundColor: "var(--brand-primary)",
          color: "var(--brand-primary-foreground)",
          borderColor: "var(--brand-primary)",
        }}
      >
        Ver todos los vehículos
      </Link>
    </main>
  );
}
