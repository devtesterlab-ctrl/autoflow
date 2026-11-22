import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <Link href="/" className="inline-flex h-11 items-center text-sm font-semibold underline underline-offset-4">
        ← Volver al inicio
      </Link>
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight font-display">{title}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Última actualización: {updated}</p>
      </header>
      <div className="space-y-6 leading-relaxed">{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
