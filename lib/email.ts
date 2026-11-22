import "server-only";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Envía por Resend (https://resend.com). Sin RESEND_API_KEY (desarrollo) el email se imprime en la
 * terminal, con el link incluido, para poder probar los flujos sin configurar nada.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`\n[email — modo desarrollo]\nPara: ${recipients.join(", ")}\nAsunto: ${message.subject}\n\n${message.text}\n`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "AutoFlow <onboarding@resend.dev>",
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("[email] Resend respondió", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] No se pudo enviar", error);
    return false;
  }
}
