import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePlatformAdmin();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-black text-white dark:border-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-widest">
            AutoFlow · Administración
          </Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <span className="hidden max-w-[16rem] truncate text-neutral-400 sm:inline">{user.email}</span>
            <Link href="/dashboard" className="underline underline-offset-4">
              Mi panel
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
