import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
  "h-14 w-full border-2 border-black bg-transparent px-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; notice?: string }>;
}) {
  const { error, callbackUrl, notice } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Ingresar</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Panel de tu agencia.</p>
      </header>

      {notice && NOTICES[notice] ? (
        <p role="status" className="border-2 border-black p-3 text-sm font-semibold dark:border-white">
          {NOTICES[notice]}
        </p>
      ) : null}

      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Email</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={INPUT_CLASS} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Contraseña</span>
          <input name="password" type="password" required minLength={8} autoComplete="current-password" className={INPUT_CLASS} />
        </label>

        {error ? (
          <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
            {error === "rate" ? "Demasiados intentos. Probá de nuevo en unos minutos." : "Email o contraseña incorrectos."}
          </p>
        ) : null}

        <button type="submit" className="h-14 w-full border-2 border-black bg-black text-lg font-bold text-white active:translate-y-px dark:border-white dark:bg-white dark:text-black">
          Entrar
        </button>
      </form>

      <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          <a href="/forgot-password" className="font-bold underline underline-offset-4">
            Olvidé mi contraseña
          </a>
        </p>
        <p>
          ¿Primera vez?{" "}
          <a href="/register" className="font-bold underline underline-offset-4">
            Crear cuenta
          </a>
        </p>
      </div>
    </main>
  );
}
