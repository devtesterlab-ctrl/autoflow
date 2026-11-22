import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Borrador general: debe ser revisado por un profesional del derecho antes del lanzamiento comercial.
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "AutoFlow";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="19 de noviembre de 2026">
      <LegalSection title="1. Quién presta el servicio">
        <p>
          AutoFlow es prestado por {ENTITY}.{CONTACT ? ` Para consultas escribinos a ${CONTACT}.` : ""} Al crear una
          cuenta o usar el servicio aceptás estos términos.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué es AutoFlow">
        <p>
          Una plataforma para agencias y revendedores de autos usados que incluye un catálogo web propio y un sistema
          simple de seguimiento de interesados (CRM). AutoFlow no participa ni interviene en las operaciones de
          compraventa entre las agencias y sus clientes.
        </p>
      </LegalSection>

      <LegalSection title="3. Tu cuenta">
        <p>
          Tenés que brindar datos verdaderos y mantener tu contraseña en reserva. Sos responsable de la actividad de
          los usuarios que sumes a tu agencia y de avisarnos si sospechás un uso no autorizado.
        </p>
      </LegalSection>

      <LegalSection title="4. Planes y límites">
        <p>
          Cada plan define la cantidad de autos activos (disponibles o reservados), de usuarios y si incluye dominio
          propio. Los precios y condiciones se informan al contratar. Si alcanzás el límite de tu plan no podés publicar
          más autos hasta liberar lugar o ampliar el plan. Los cambios de plan se gestionan a pedido.
        </p>
      </LegalSection>

      <LegalSection title="5. Contenido que publicás">
        <p>
          Cada agencia es responsable de la veracidad de los datos, los precios y las fotos de sus vehículos, y de
          contar con los derechos para usar ese contenido. Los valores de la calculadora de anticipo son orientativos y
          no constituyen una oferta de financiación.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso aceptable">
        <ul className="list-disc space-y-1 pl-6">
          <li>No usar el servicio con fines ilícitos ni publicar vehículos o información engañosa.</li>
          <li>No intentar acceder a datos de otras agencias ni vulnerar la seguridad del sistema.</li>
          <li>No realizar un uso automatizado o abusivo que afecte el funcionamiento del servicio.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Suspensión y baja">
        <p>
          Podemos suspender una cuenta ante incumplimientos de estos términos o falta de pago. Podés pedir la baja de tu
          cuenta y la eliminación de tus datos en cualquier momento escribiéndonos.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidad y responsabilidad">
        <p>
          Hacemos esfuerzos razonables para que el servicio esté disponible, pero no garantizamos que funcione sin
          interrupciones ni errores. En la medida que la ley lo permita, nuestra responsabilidad se limita a los montos
          abonados por el servicio y no alcanza a lucro cesante ni a daños indirectos.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios en los términos">
        <p>Podemos actualizar estos términos. Los cambios importantes se comunican por email o dentro del panel.</p>
      </LegalSection>

      <LegalSection title="10. Ley aplicable">
        <p>Estos términos se rigen por las leyes de la República Argentina.</p>
      </LegalSection>
    </LegalPage>
  );
}
