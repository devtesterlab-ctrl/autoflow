import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LeadAlertsProvider } from "@/components/dashboard/LeadAlerts";
import { isPlatformAdminEmail } from "@/lib/admin";
import { getLeadSummary } from "@/lib/lead-summary";
import { requireTenant } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { tenant, user, db } = await requireTenant();
  if (!tenant.onboardingCompleted) redirect("/onboarding");

  const [summary, showAdmin] = await Promise.all([getLeadSummary(db), Promise.resolve(isPlatformAdminEmail(user.email))]);

  return (
    <LeadAlertsProvider initial={summary}>
      <div className="min-h-dvh pb-24 md:pb-8">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/70 dark:border-white/10 dark:bg-neutral-950/60 backdrop-blur-xl">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
            <span className="truncate text-sm font-semibold uppercase tracking-wider">{tenant.name}</span>
            <nav className="hidden gap-2 md:flex" aria-label="Principal">
              <DashboardNav variant="top" showAdmin={showAdmin} />
            </nav>
          </div>
        </header>

        {children}

        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-20 grid h-16 border-t border-neutral-200 bg-white/70 md:hidden dark:border-white/10 dark:bg-neutral-950/60 backdrop-blur-xl"
          style={{ gridTemplateColumns: `repeat(${showAdmin ? 5 : 4}, minmax(0, 1fr))` }}
        >
          <DashboardNav variant="bottom" showAdmin={showAdmin} />
        </nav>
      </div>
    </LeadAlertsProvider>
  );
}
