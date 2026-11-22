import { AuthError } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarFront } from "lucide-react";
import { signIn } from "@/auth";
import { isRateLimited } from "@/lib/rate-limit";

function safeCallback(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function loginAction(formData: FormData) {
  "use server";
  const redirectTo = safeCallback(String(formData.get("callbackUrl") ?? ""));
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (await isRateLimited(`login:${ip}:${email}`, 8, 15 * 60 * 1000)) redirect("/login?error=rate");

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(redirectTo)}`);
    }
    throw error;
  }
}

const NOTICES: Record<string, string> = {
  changed: "Contraseña actualizada. Ingresá con la nueva.",
  reset: "Listo. Ya podés ingresar con tu nueva contraseña.",
  session: "Tu sesión terminó o la agencia está suspendida. Ingresá de nuevo.",
};

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; notice?: string }>;
}) {
  const { error, callbackUrl, notice } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#11131C]">
        <header className="mb-6 space-y-2">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <CarFront className="h-4 w-4" /> AutoFlow
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Ingresar al panel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administrá tu catálogo y tus leads.</p>
        </header>

        {notice && NOTICES[notice] ? (
          <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {NOTICES[notice]}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" className={INPUT_CLASS} />
          </label>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contraseña</span>
              <a href="/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                ¿La olvidaste?
              </a>
            </div>
            <input name="password" type="password" required minLength={8} autoComplete="current-password" className={INPUT_CLASS} />
          </label>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {error === "rate" ? "Demasiados intentos. Probá de nuevo en unos minutos." : "Email o contraseña incorrectos."}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-2xs transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Entrar
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        ¿Todavía no tenés agencia?{" "}
        <a href="/register" className="font-semibold text-slate-900 underline underline-offset-4 dark:text-white">
          Crear cuenta
        </a>
      </p>
    </main>
  );
}
