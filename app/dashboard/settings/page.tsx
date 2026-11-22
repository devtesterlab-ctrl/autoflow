import { PlanBanner } from "@/components/dashboard/PlanBanner";
import { AccountForm } from "@/components/settings/AccountForm";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getPlanUsage } from "@/lib/plan-limits";
import { requireTenant } from "@/lib/session";

export default async function SettingsPage() {
  const { tenant, user, db } = await requireTenant();
  const usage = await getPlanUsage(db, tenant.id, tenant.plan);
  const isOwner = user.role === "OWNER";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Ajustes</h1>

      <PlanBanner usage={usage} agencyName={tenant.name} />

      {isOwner ? (
        <SettingsForm
          rootDomain={process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"}
          customDomain={tenant.customDomain}
          initial={{
            name: tenant.name,
            slug: tenant.slug,
            whatsappNumber: tenant.whatsappNumber ?? "",
            city: tenant.city ?? "",
            address: tenant.address ?? "",
            instagramHandle: tenant.instagramHandle ?? "",
            primaryColor: tenant.primaryColor,
            logoUrl: tenant.logoUrl,
            notifyNewLeads: tenant.notifyNewLeads,
            notifyEmail: tenant.notifyEmail ?? "",
          }}
        />
      ) : (
        <p className="border-2 border-black p-4 font-semibold dark:border-white">
          Los ajustes de la agencia los edita el dueño. Acá podés cambiar tus datos y tu contraseña.
        </p>
      )}

      <div className="max-w-xl">
        <AccountForm name={user.name} email={user.email} />
      </div>
    </main>
  );
}
