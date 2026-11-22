import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Política de privacidad" };

// Borrador general: debe ser revisado por un profesional del derecho antes del lanzamiento comercial.
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "AutoFlow";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="19 de noviembre de 2026">
      <LegalSection title="1. Responsable">
        <p>
          {ENTITY} es responsable del tratamiento de los datos de las cuentas de AutoFlow.
          {CONTACT ? ` Podés contactarnos en ${CONTACT}.` : ""}
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos tratamos">
        <ul className="list-disc space-y-1 pl-6">
          <li>Cuenta: nombre, email y contraseña (guardada cifrada, nunca en texto legible).</li>
          <li>Agencia: nombre, WhatsApp, ciudad, dirección, Instagram, logo y datos de sus vehículos.</li>
          <li>
            Interesados: el nombre que una persona ingresa al consultar por un auto, el vehículo consultado y los datos
            (teléfono, notas) que la agencia cargue en su seguimiento.
          </li>
          <li>Datos técnicos: dirección IP, usada solo para seguridad y para limitar abusos.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Roles">
        <p>
          Sobre los datos de los interesados, la responsable es cada agencia; AutoFlow actúa como encargado y solo los
          trata para prestar el servicio. Sobre los datos de las cuentas, AutoFlow es responsable.
        </p>
      </LegalSection>

      <LegalSection title="4. Para qué los usamos">
        <p>
          Para prestar el servicio, garantizar su seguridad, enviar avisos del servicio (por ejemplo, recuperación de
          contraseña y aviso de consultas nuevas) y mejorarlo. No vendemos datos personales.
        </p>
      </LegalSection>

      <LegalSection title="5. Con quién los compartimos">
        <p>
          Usamos proveedores que procesan datos por nuestra cuenta: Vercel (alojamiento), Neon (base de datos),
          Cloudflare (almacenamiento de imágenes), Resend (envío de emails) y Upstash (control de abusos). Algunos
          operan fuera de la Argentina, por lo que puede haber transferencia internacional de datos.
        </p>
      </LegalSection>

      <LegalSection title="6. Cuánto tiempo los conservamos">
        <p>
          Mientras la cuenta esté activa. Al darse de baja eliminamos los datos, salvo que una obligación legal exija
          conservarlos; las copias de seguridad se renuevan de forma periódica.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos">
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiéndonos
          {CONTACT ? ` a ${CONTACT}` : ""}. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de
          Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes
          resulten afectados en sus derechos por incumplimiento de las normas de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Usamos únicamente la cookie de sesión necesaria para mantenerte ingresado. No usamos cookies publicitarias ni
          de seguimiento.
        </p>
      </LegalSection>

      <LegalSection title="9. Seguridad">
        <p>
          Las conexiones van cifradas, las contraseñas se guardan con hash y los datos de cada agencia están aislados
          de las demás. Ningún sistema es infalible: si detectamos un incidente que te afecte, te avisamos.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios">
        <p>Podemos actualizar esta política y publicaremos la nueva versión en esta página.</p>
      </LegalSection>
    </LegalPage>
  );
}
