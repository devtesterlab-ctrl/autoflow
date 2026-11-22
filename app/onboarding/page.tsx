import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { requireTenant } from "@/lib/session";
import { slugify } from "@/lib/slug";

export default async function OnboardingPage() {
  const { tenant, user } = await requireTenant();

  if (tenant.onboardingCompleted) redirect("/dashboard");

  // El slug que se asignó al registrarse es provisorio ("agencia-xxxx"): se sugiere uno a partir del nombre.
  const suggestedSlug = tenant.slug.startsWith("agencia-") ? slugify(tenant.name) : tenant.slug;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm font-extrabold uppercase tracking-widest text-neutral-500">AutoFlow</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {user.role === "OWNER" ? "Armemos tu catálogo" : "Falta que el dueño configure la agencia"}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">Son 3 pasos y menos de 2 minutos.</p>
      </header>

      {user.role === "OWNER" ? (
        <OnboardingWizard
          rootDomain={process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"}
          initial={{
            name: tenant.name,
            slug: suggestedSlug,
            whatsappNumber: tenant.whatsappNumber ?? "",
            city: tenant.city ?? "",
            address: tenant.address ?? "",
            instagramHandle: tenant.instagramHandle ?? "",
            primaryColor: tenant.primaryColor,
          }}
        />
      ) : (
        <p className="border-2 border-black p-4 font-semibold dark:border-white">
          Pedile al dueño de la agencia que complete la configuración inicial.
        </p>
      )}
    </main>
  );
}
