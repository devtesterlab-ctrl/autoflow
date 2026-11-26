import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBoard } from "@/components/admin/StatusBoard";
import { requirePlatformAdmin } from "@/lib/admin";
import { getSystemStatus } from "@/lib/system-status";

export default async function SystemStatusPage() {
  const admin = await requirePlatformAdmin();
  const status = await getSystemStatus();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link href="/admin" className="inline-flex h-10 items-center gap-2 text-sm font-medium underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Estado del sistema</h1>
      <StatusBoard initial={status} adminEmail={admin.user.email} />
    </main>
  );
}
