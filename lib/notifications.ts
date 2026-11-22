import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { newLeadEmail } from "@/lib/email-templates";
import { isRateLimited } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/site-url";

/**
 * Avisa por email que entró un lead por el catálogo. Va a la dirección configurada en Ajustes
 * o, si no hay, a los dueños de la agencia. Nunca lanza: un fallo de email no debe afectar al comprador.
 */
export async function notifyNewLead(params: {
  tenantId: string;
  leadName: string;
  vehicleLabel: string | null;
}): Promise<void> {
  try {
    // Tope por agencia: ante un ataque o un pico de consultas no se inunda el correo.
    if (await isRateLimited(`lead-mail:${params.tenantId}`, 10, 10 * 60 * 1000)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: {
        name: true,
        notifyNewLeads: true,
        notifyEmail: true,
        users: { where: { role: "OWNER" }, select: { email: true } },
      },
    });
    if (!tenant || !tenant.notifyNewLeads) return;

    const recipients = tenant.notifyEmail ? [tenant.notifyEmail] : tenant.users.map((user) => user.email);
    if (recipients.length === 0) return;

    await sendEmail({
      to: recipients,
      ...newLeadEmail({
        agencyName: tenant.name,
        leadName: params.leadName,
        vehicleLabel: params.vehicleLabel,
        link: `${getAppOrigin()}/dashboard/leads`,
      }),
    });
  } catch (error) {
    console.error("[notifyNewLead]", error);
  }
}
