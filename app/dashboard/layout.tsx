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
      <div className="min-h-dvh bg-[#F8FAFC] pb-24 text-slate-900 md:pb-10 dark:bg-[#090A0F] dark:text-slate-50">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#090A0F]/80">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {tenant.name}
              </span>
            </div>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
              <DashboardNav variant="top" showAdmin={showAdmin} />
            </nav>
          </div>
        </header>

        {children}

        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-20 grid h-16 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-[#090A0F]/90"
          style={{ gridTemplateColumns: `repeat(${showAdmin ? 5 : 4}, minmax(0, 1fr))` }}
        >
          <DashboardNav variant="bottom" showAdmin={showAdmin} />
        </nav>
      </div>
    </LeadAlertsProvider>
  );
}
