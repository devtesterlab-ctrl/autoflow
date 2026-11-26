import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePlatformAdmin();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-transparent bg-neutral-900/90 text-white dark:border-transparent backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-wider">
            AutoFlow · Administración
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="hidden max-w-[16rem] truncate text-neutral-400 sm:inline">{user.email}</span>
            <Link href="/admin/estado" className="underline underline-offset-4">
              Estado
            </Link>
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
