import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
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
  "h-12 w-full border border-neutral-300 bg-white px-4 text-base outline-none focus:ring-4 focus:ring-neutral-900/10 dark:border-white/20 dark:focus:ring-white/10 dark:bg-white/5 focus:border-neutral-400 dark:focus:border-white/40 rounded-xl";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const inviteRequired = Boolean(process.env.REGISTRATION_INVITE_CODE);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight font-display">Crear cuenta</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Tu catálogo y tu CRM en menos de 2 minutos.</p>
      </header>

      <form action={registerAction} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Tu nombre</span>
          <input name="name" required autoComplete="name" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Nombre de la agencia</span>
          <input name="agencyName" required autoComplete="organization" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT_CLASS} />
        </label>
        {inviteRequired ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Código de invitación</span>
            <input name="inviteCode" required autoComplete="off" className={INPUT_CLASS} />
          </label>
        ) : null}

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" className="font-semibold underline underline-offset-4">
              términos y condiciones
            </a>{" "}
            y la{" "}
            <a href="/privacidad" target="_blank" className="font-semibold underline underline-offset-4">
              política de privacidad
            </a>
            .
          </span>
        </label>

        {error ? (
          <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300 dark:border-red-800 rounded-2xl">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server}
          </p>
        ) : null}

        <button type="submit" className="h-12 w-full border border-transparent bg-neutral-900 text-base font-semibold text-white active:scale-[0.98] dark:border-transparent dark:bg-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
          Crear mi cuenta
        </button>
      </form>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        ¿Ya tenés cuenta?{" "}
        <a href="/login" className="font-semibold underline underline-offset-4">
          Ingresar
        </a>
      </p>
    </main>
  );
}
