import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight font-display">AutoFlow</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Catálogo web y mini-CRM para agencias de autos usados.
      </p>
      <a
        href="/login"
        className="inline-flex h-12 items-center justify-center border border-transparent bg-neutral-900 px-6 text-base font-semibold text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
      >
        Ingresar al panel
      </a>
      <footer className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/terminos" className="font-semibold underline underline-offset-4">
          Términos
        </Link>
        <Link href="/privacidad" className="font-semibold underline underline-offset-4">
          Privacidad
        </Link>
      </footer>
    </main>
  );
}
