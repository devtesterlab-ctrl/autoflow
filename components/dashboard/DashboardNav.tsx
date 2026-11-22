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
        const indicator =
          (badge ?? 0) > 0 || alert ? (
            <span
              className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center px-1 text-[11px] font-bold ${
                alert ? "bg-red-600 text-white" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              }`}
              aria-label={`${badge ?? 0} nuevos${alert ? ", con seguimientos vencidos" : ""}`}
            >
              {(badge ?? 0) > 0 ? badge : "!"}
            </span>
          ) : null;

        if (variant === "top") {
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-10 items-center gap-2 border px-4 text-sm font-semibold ${
                active
                  ? "border-transparent bg-neutral-900 text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                  : "border-transparent"
              } rounded-xl`}
            >
              <Icon className="h-4 w-4" /> {label}
              {indicator}
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors" : ""
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {indicator}
            </span>
            {label}
          </Link>
        );
      })}
    </>
  );
}
