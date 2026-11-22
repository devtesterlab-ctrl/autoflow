"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Home, Settings, Shield, Users, type LucideIcon } from "lucide-react";
import { useLeadSummary } from "@/components/dashboard/LeadAlerts";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  alert?: boolean;
}

export function DashboardNav({ variant, showAdmin }: { variant: "top" | "bottom"; showAdmin: boolean }) {
  const pathname = usePathname();
  const summary = useLeadSummary();

  const links: NavLink[] = [
    { href: "/dashboard", label: "Inicio", icon: Home, exact: true },
    { href: "/dashboard/vehicles", label: "Vehículos", icon: Car },
    { href: "/dashboard/leads", label: "Leads", icon: Users, badge: summary.newCount, alert: summary.overdueCount > 0 },
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <>
      {links.map(({ href, label, icon: Icon, exact, badge, alert }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const hasIndicator = (badge ?? 0) > 0 || alert;

        if (variant === "top") {
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {hasIndicator ? (
                <span
                  className={`ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                    alert
                      ? "bg-red-600 text-white"
                      : active
                        ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900"
                        : "bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white"
                  }`}
                  aria-label={`${badge ?? 0} nuevos${alert ? ", con seguimientos vencidos" : ""}`}
                >
                  {(badge ?? 0) > 0 ? badge : "!"}
                </span>
              ) : null}
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
              active
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span
              className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                active ? "bg-slate-900/10 dark:bg-white/15" : ""
              }`}
            >
              <Icon className="h-4 w-4" />
              {hasIndicator ? (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                    alert ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  }`}
                >
                  {(badge ?? 0) > 0 ? badge : "!"}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );
}
