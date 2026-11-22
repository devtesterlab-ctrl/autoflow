import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Check, Fuel, Gauge, Settings2 } from "lucide-react";
import { FinanceCalculator } from "@/components/catalog/FinanceCalculator";
import { InquiryButton } from "@/components/catalog/InquiryButton";
import { VehicleGallery } from "@/components/catalog/VehicleGallery";
import { getPublicVehicleDetail, PUBLIC_ID_PATTERN } from "@/lib/public-vehicle";
import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";
import { formatKm, formatPrice, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

type PageProps = { params: Promise<{ domain: string; vehicleId: string }> };

const loadVehicle = cache(async (domain: string, vehicleId: string) => {
  if (!PUBLIC_ID_PATTERN.test(vehicleId)) return null;

  const tenant = await getTenantByDomain(domain);
  if (!tenant) return null;

  const vehicle = await getPublicVehicleDetail(tenant.id, vehicleId);
  if (!vehicle) return null;

  return { tenant, vehicle };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain, vehicleId } = await params;
  const data = await loadVehicle(domain, vehicleId);
  if (!data) return { title: "Auto no disponible" };

  const { tenant, vehicle } = data;
  const name = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  const title = `${name} ${vehicle.year}`;
  const priceLabel = formatPrice(Number(vehicle.price), vehicle.currency);
  const description = `${priceLabel} · ${vehicle.year} · ${formatKm(vehicle.mileage)} · ${TRANSMISSION_LABELS[vehicle.transmission]} · ${FUEL_LABELS[vehicle.fuelType]}. ${tenant.name}${tenant.city ? ` (${tenant.city})` : ""}`;
  const url = `${getTenantOrigin(tenant)}/auto/${vehicle.id}`;
  const ogImage = vehicle.images.length > 0 ? `${url}/og` : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: tenant.name,
      locale: "es_AR",
      url,
      title: `${title} · ${priceLabel}`,
      description,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: `${title} · ${priceLabel}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function VehiclePage({ params }: PageProps) {
  const { domain, vehicleId } = await params;
  const data = await loadVehicle(domain, vehicleId);
  if (!data) notFound();

  const { tenant, vehicle } = data;
  const title = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  const price = Number(vehicle.price);
  const priceLabel = formatPrice(price, vehicle.currency);
  const reserved = vehicle.status === "RESERVED";
  const canContact = normalizeWhatsappNumber(tenant.whatsappNumber) !== null;

  const keyHighlights = [
    { icon: Calendar, label: "Año", value: String(vehicle.year) },
    { icon: Gauge, label: "Kilometraje", value: formatKm(vehicle.mileage) },
    { icon: Settings2, label: "Caja", value: TRANSMISSION_LABELS[vehicle.transmission] },
    { icon: Fuel, label: "Combustible", value: FUEL_LABELS[vehicle.fuelType] },
  ];

  const specs: { label: string; value: string }[] = [
    { label: "Marca", value: vehicle.brand },
    { label: "Modelo", value: vehicle.model },
    ...(vehicle.version ? [{ label: "Versión", value: vehicle.version }] : []),
    { label: "Año", value: String(vehicle.year) },
    { label: "Kilometraje", value: formatKm(vehicle.mileage) },
    { label: "Transmisión", value: TRANSMISSION_LABELS[vehicle.transmission] },
    { label: "Combustible", value: FUEL_LABELS[vehicle.fuelType] },
    ...(vehicle.color ? [{ label: "Color", value: vehicle.color }] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${title} ${vehicle.year}`,
    brand: { "@type": "Brand", name: vehicle.brand },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" },
    vehicleTransmission: TRANSMISSION_LABELS[vehicle.transmission],
    fuelType: FUEL_LABELS[vehicle.fuelType],
    image: vehicle.images.slice(0, 5).map((image) => image.url),
    url: `${getTenantOrigin(tenant)}/auto/${vehicle.id}`,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: vehicle.currency,
      availability: reserved ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
      seller: { "@type": "AutoDealer", name: tenant.name },
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
      />

      <nav aria-label="Navegación" className="mb-5">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-[#11131C] dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:items-start lg:gap-10">
        {/* Columna izquierda: Galería + Ficha técnica + Equipamiento + Descripción */}
        <div className="min-w-0 space-y-8">
          <VehicleGallery
            images={vehicle.images.map((image) => ({ id: image.id, url: image.url }))}
            alt={`${title} ${vehicle.year}`}
            reserved={reserved}
          />

          <section aria-labelledby="specs-title" className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#11131C]">
            <h2 id="specs-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Ficha técnica
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {specs.map((spec) => (
                <div key={spec.label} className="space-y-0.5 border-b border-slate-100 pb-3 dark:border-white/5">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {spec.label}
                  </dt>
                  <dd className="text-sm font-semibold text-slate-900 tabular-nums dark:text-white">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {vehicle.features.length > 0 ? (
            <section aria-labelledby="features-title" className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#11131C]">
              <h2 id="features-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Equipamiento destacado
              </h2>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {vehicle.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:bg-white/[0.03] dark:text-slate-200"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {vehicle.description ? (
            <section aria-labelledby="description-title" className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#11131C]">
              <h2 id="description-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Comentarios de la agencia
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                {vehicle.description}
              </p>
            </section>
          ) : null}
        </div>

        {/* Columna derecha sticky: Resumen, Grilla 2x2, CTA WhatsApp y Calculadora */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 dark:border-white/10 dark:bg-[#11131C]">
            <div className="space-y-2">
              {reserved ? (
                <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold tracking-wider text-slate-950">
                  RESERVADO
                </span>
              ) : null}
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {title}
              </h1>
              <p className="font-display text-3xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-4xl dark:text-white">
                {priceLabel}
              </p>
            </div>

            {/* 4 datos clave en grilla 2x2 */}
            <div className="grid grid-cols-2 gap-2.5">
              {keyHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-white/5 dark:bg-white/[0.03]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-2xs dark:bg-white/5 dark:text-slate-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="truncate text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <InquiryButton
              domain={domain}
              vehicleId={vehicle.id}
              vehicleTitle={`${title} ${vehicle.year}`}
              priceLabel={priceLabel}
              canContact={canContact}
            />
          </div>

          <FinanceCalculator price={price} currency={vehicle.currency} />
        </aside>
      </div>
    </main>
  );
}
