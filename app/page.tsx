import Link from "next/link";
import { ArrowRight, CarFront } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-6 py-12">
      <div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <CarFront className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-bold">AutoFlow</span>
      </div>

      <div className="space-y-6 py-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Showroom Digital &amp; Mini-CRM
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Tu agencia online, simple y lista para vender.
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
          Publicá tu stock de vehículos con una experiencia moderna y gestioná todas tus consultas de WhatsApp desde un solo lugar.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Ingresar al panel <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Crear cuenta
          </Link>
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200/80 pt-6 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span>© {new Date().getFullYear()} AutoFlow</span>
        <div className="flex gap-5">
          <Link href="/terminos" className="font-medium transition-colors hover:text-slate-900 dark:hover:text-white">
            Términos
          </Link>
          <Link href="/privacidad" className="font-medium transition-colors hover:text-slate-900 dark:hover:text-white">
            Privacidad
          </Link>
        </div>
      </footer>
    </main>
  );
}
