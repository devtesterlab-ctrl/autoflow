import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-4xl font-extrabold tracking-tight">AutoFlow</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Catálogo web y mini-CRM para agencias de autos usados.
      </p>
      <a
        href="/login"
        className="inline-flex h-14 items-center justify-center border-2 border-black bg-black px-6 text-lg font-bold text-white dark:border-white dark:bg-white dark:text-black"
      >
        Ingresar al panel
      </a>
      <footer className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/terminos" className="font-bold underline underline-offset-4">
          Términos
        </Link>
        <Link href="/privacidad" className="font-bold underline underline-offset-4">
          Privacidad
        </Link>
      </footer>
    </main>
  );
}
