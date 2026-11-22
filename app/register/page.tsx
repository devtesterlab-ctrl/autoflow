import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { CarFront } from "lucide-react";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  agencyName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(128),
});

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Revisá los datos: la contraseña necesita al menos 8 caracteres.",
  email: "Ya existe una cuenta con ese email.",
  invite: "El código de invitación no es válido.",
  rate: "Demasiados intentos. Probá de nuevo más tarde.",
  terms: "Tenés que aceptar los términos y la política de privacidad.",
  server: "No pudimos crear la cuenta. Probá de nuevo.",
};

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function registerAction(formData: FormData) {
  "use server";

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (await isRateLimited(`register:${ip}`, 5, 60 * 60 * 1000)) redirect("/register?error=rate");

  const inviteCode = process.env.REGISTRATION_INVITE_CODE;
  if (inviteCode && !safeEqual(String(formData.get("inviteCode") ?? ""), inviteCode)) {
    redirect("/register?error=invite");
  }

  if (formData.get("acceptTerms") !== "on") redirect("/register?error=terms");

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    agencyName: formData.get("agencyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/register?error=invalid");

  const { name, agencyName, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.tenant.create({
      data: {
        name: agencyName,
        slug: `agencia-${randomBytes(4).toString("hex")}`,
        plan: "FREE",
        users: { create: { email, name, passwordHash, role: "OWNER" } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/register?error=email");
    }
    console.error("[register]", error);
    redirect("/register?error=server");
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/onboarding" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const inviteRequired = Boolean(process.env.REGISTRATION_INVITE_CODE);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#11131C]">
        <header className="mb-6 space-y-2">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <CarFront className="h-4 w-4" /> AutoFlow
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Crear cuenta
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tu catálogo y tu CRM en menos de 2 minutos.</p>
        </header>

        <form action={registerAction} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tu nombre</span>
            <input name="name" required autoComplete="name" className={INPUT_CLASS} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre de la agencia</span>
            <input name="agencyName" required autoComplete="organization" className={INPUT_CLASS} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" className={INPUT_CLASS} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contraseña</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT_CLASS} />
          </label>
          {inviteRequired ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Código de invitación</span>
              <input name="inviteCode" required autoComplete="off" className={INPUT_CLASS} />
            </label>
          ) : null}

          <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="font-semibold text-slate-900 underline underline-offset-4 dark:text-white">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" className="font-semibold text-slate-900 underline underline-offset-4 dark:text-white">
                política de privacidad
              </a>
              .
            </span>
          </label>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-2xs transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Crear mi cuenta
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        ¿Ya tenés cuenta?{" "}
        <a href="/login" className="font-semibold text-slate-900 underline underline-offset-4 dark:text-white">
          Ingresar
        </a>
      </p>
    </main>
  );
}
