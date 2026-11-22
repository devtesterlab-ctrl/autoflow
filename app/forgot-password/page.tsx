import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { generateToken, hashToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import { isRateLimited } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/site-url";

const emailSchema = z.string().trim().toLowerCase().email().max(120);

async function requestResetAction(formData: FormData) {
  "use server";

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const parsed = emailSchema.safeParse(formData.get("email"));

  // Siempre se responde lo mismo: así nadie puede averiguar qué emails están registrados.
  if (!parsed.success) redirect("/forgot-password?sent=1");
  const email = parsed.data;
  if (await isRateLimited(`forgot-ip:${ip}`, 5, 15 * 60 * 1000) || await isRateLimited(`forgot-email:${email}`, 3, 60 * 60 * 1000)) {
    redirect("/forgot-password?sent=1");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, tenant: { select: { isActive: true } } },
  });

  if (user && user.tenant.isActive) {
    const token = generateToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      }),
    ]);

    const link = `${getAppOrigin()}/reset-password?token=${token}`;
    await sendEmail({ to: email, ...passwordResetEmail({ name: user.name, link }) });
  }

  redirect("/forgot-password?sent=1");
}

const INPUT_CLASS =
  "h-12 w-full border border-neutral-300 bg-white px-4 text-base outline-none focus:ring-4 focus:ring-neutral-900/10 dark:border-white/20 dark:focus:ring-white/10 dark:bg-white/5 focus:border-neutral-400 dark:focus:border-white/40 rounded-xl";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
}) {
  const { sent, expired } = await searchParams;
  const devHint = process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight font-display">Recuperar contraseña</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Ingresá tu email y te mandamos un link para elegir una nueva.
        </p>
      </header>

      {expired ? (
        <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300 dark:border-red-800 rounded-2xl">
          Ese link venció o ya se usó. Pedí uno nuevo.
        </p>
      ) : null}

      {sent ? (
        <div role="status" className="space-y-2 border border-neutral-200 p-4 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.04]">
          <p className="font-bold">Listo. Si el email está registrado, te enviamos un link válido por 60 minutos.</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Revisá también la carpeta de spam.</p>
          {devHint ? (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Modo desarrollo: sin RESEND_API_KEY el email aparece en la terminal donde corre <code>npm run dev</code>.
            </p>
          ) : null}
        </div>
      ) : (
        <form action={requestResetAction} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" className={INPUT_CLASS} />
          </label>
          <button type="submit" className="h-12 w-full border border-transparent bg-neutral-900 text-base font-semibold text-white active:scale-[0.98] dark:border-transparent dark:bg-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
            Enviarme el link
          </button>
        </form>
      )}

      <a href="/login" className="text-sm font-semibold underline underline-offset-4">
        Volver a ingresar
      </a>
    </main>
  );
}
