import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { findValidResetToken } from "@/lib/password-reset";
import { passwordSchema } from "@/lib/validators/settings";

async function resetPasswordAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (error: string) => `/reset-password?token=${encodeURIComponent(token)}&error=${error}`;

  if (password !== confirm) redirect(back("mismatch"));
  if (!passwordSchema.safeParse(password).success) redirect(back("weak"));

  const record = await findValidResetToken(token);
  if (!record) redirect("/forgot-password?expired=1");

  // El link se "reclama" de forma atómica: si dos pedidos llegan juntos, solo uno lo consigue.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) redirect("/forgot-password?expired=1");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    // sessionVersion + 1 cierra todas las sesiones abiertas con la contraseña anterior.
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  redirect("/login?notice=reset");
}

const INPUT_CLASS =
  "h-14 w-full border-2 border-black bg-transparent px-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30";

const ERRORS: Record<string, string> = {
  mismatch: "Las contraseñas no coinciden.",
  weak: "La contraseña necesita al menos 8 caracteres.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  const valid = token ? await findValidResetToken(token) : null;

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Link inválido</h1>
        <p className="text-neutral-600 dark:text-neutral-400">El link venció o ya se usó. Pedí uno nuevo y probá de nuevo.</p>
        <a href="/forgot-password" className="flex h-14 items-center justify-center border-2 border-black bg-black font-bold text-white dark:border-white dark:bg-white dark:text-black">
          Pedir un link nuevo
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Nueva contraseña</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Elegí una contraseña de al menos 8 caracteres.</p>
      </header>

      <form action={resetPasswordAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nueva contraseña</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Repetila</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={INPUT_CLASS} />
        </label>

        {error ? (
          <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
            {ERRORS[error] ?? ERRORS.weak}
          </p>
        ) : null}

        <button type="submit" className="h-14 w-full border-2 border-black bg-black text-lg font-bold text-white active:translate-y-px dark:border-white dark:bg-white dark:text-black">
          Guardar contraseña
        </button>
      </form>
    </main>
  );
}
