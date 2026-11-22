import Link from "next/link";

export default function SiteNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-black">No encontramos este auto</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Puede que ya se haya vendido o que el link esté incompleto.
      </p>
      <Link
        href="/"
        className="flex h-14 items-center border-2 px-6 font-black"
        style={{
          backgroundColor: "var(--brand-primary)",
          color: "var(--brand-primary-foreground)",
          borderColor: "var(--brand-primary)",
        }}
      >
        Ver todos los autos
      </Link>
    </main>
  );
}
