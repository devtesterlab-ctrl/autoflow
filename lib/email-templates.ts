export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutParams {
  preheader: string;
  title: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}

function renderHtml(params: LayoutParams): string {
  const paragraphs = params.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;">${escapeHtml(text)}</p>`)
    .join("");

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:3px solid #0a0a0a;"><tr><td style="padding:24px;">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#525252;">AutoFlow</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">${escapeHtml(params.title)}</h1>
${paragraphs}
<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 22px;margin:6px 0 18px;">${escapeHtml(params.ctaLabel)}</a>
<p style="margin:0 0 6px;font-size:12px;color:#737373;word-break:break-all;">Si el botón no funciona, copiá este link: ${escapeHtml(params.ctaUrl)}</p>
<p style="margin:0;font-size:12px;color:#737373;">${escapeHtml(params.footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function renderText(params: LayoutParams): string {
  return [params.title, "", ...params.paragraphs, "", `${params.ctaLabel}: ${params.ctaUrl}`, "", params.footer].join("\n");
}

export function passwordResetEmail(params: { name: string; link: string }) {
  const layout: LayoutParams = {
    preheader: "Elegí una nueva contraseña para tu cuenta de AutoFlow.",
    title: "Recuperá tu contraseña",
    paragraphs: [
      `Hola ${params.name}, recibimos un pedido para cambiar la contraseña de tu cuenta.`,
      "El link vale por 60 minutos y se puede usar una sola vez.",
    ],
    ctaLabel: "Elegir nueva contraseña",
    ctaUrl: params.link,
    footer: "Si no fuiste vos, ignorá este email: tu contraseña no cambia.",
  };
  return { subject: "Recuperá tu contraseña de AutoFlow", html: renderHtml(layout), text: renderText(layout) };
}

export function newLeadEmail(params: { agencyName: string; leadName: string; vehicleLabel: string | null; link: string }) {
  const subject = params.vehicleLabel
    ? `Nueva consulta por ${params.vehicleLabel}`
    : "Nueva consulta en tu catálogo";
  const layout: LayoutParams = {
    preheader: `${params.leadName} acaba de consultar en el catálogo de ${params.agencyName}.`,
    title: "¡Tenés un interesado nuevo!",
    paragraphs: [
      params.vehicleLabel
        ? `${params.leadName} consultó por el ${params.vehicleLabel} desde el catálogo de ${params.agencyName}.`
        : `${params.leadName} hizo una consulta desde el catálogo de ${params.agencyName}.`,
      "Te va a escribir por WhatsApp. Responder en los primeros minutos hace la diferencia.",
    ],
    ctaLabel: "Abrir mis leads",
    ctaUrl: params.link,
    footer: "Podés desactivar estos avisos en Ajustes → Notificaciones.",
  };
  return { subject, html: renderHtml(layout), text: renderText(layout) };
}
