import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { FinanceCalculator } from "@/components/catalog/FinanceCalculator";
import { InquiryButton } from "@/components/catalog/InquiryButton";
import { VehicleGallery } from "@/components/catalog/VehicleGallery";
import { getPublicVehicleDetail, PUBLIC_ID_PATTERN } from "@/lib/public-vehicle";
import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";
import { formatKm, formatPrice, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

type PageProps = { params: Promise<{ domain: string; vehicleId: string }> };

/** Compartida entre generateMetadata y la página. Los datos salen de la caché por agencia. */
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

  const specs: { label: string; value: string }[] = [
    { label: "Año", value: String(vehicle.year) },
    { label: "Kilometraje", value: formatKm(vehicle.mileage) },
    { label: "Transmisión", value: TRANSMISSION_LABELS[vehicle.transmission] },
    { label: "Combustible", value: FUEL_LABELS[vehicle.fuelType] },
    ...(vehicle.color ? [{ label: "Color", value: vehicle.color }] : []),
    ...(vehicle.version ? [{ label: "Versión", value: vehicle.version }] : []),
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
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-4 lg:pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Link href="/" className="mb-4 inline-flex h-11 items-center gap-2 text-sm font-bold underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-x-8">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <VehicleGallery
            images={vehicle.images.map((image) => ({ id: image.id, url: image.url }))}
            alt={`${title} ${vehicle.year}`}
            reserved={reserved}
          />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="space-y-3">
            {reserved ? (
              <span className="inline-block bg-amber-400 px-3 py-1.5 text-xs font-black tracking-widest text-black">
                RESERVADO
              </span>
            ) : null}
            <h1 className="text-3xl font-black leading-tight tracking-tight">{title}</h1>
            <ul className="flex flex-wrap gap-2 text-sm font-bold">
              <li className="border-2 border-black px-3 py-1 dark:border-white">{vehicle.year}</li>
              <li className="border-2 border-black px-3 py-1 dark:border-white">{formatKm(vehicle.mileage)}</li>
              <li className="border-2 border-black px-3 py-1 dark:border-white">
                {TRANSMISSION_LABELS[vehicle.transmission]}
              </li>
            </ul>
            <p className="text-4xl font-black tracking-tight">{priceLabel}</p>
          </div>

          <InquiryButton
            domain={domain}
            vehicleId={vehicle.id}
            vehicleTitle={`${title} ${vehicle.year}`}
            priceLabel={priceLabel}
            canContact={canContact}
          />

          <FinanceCalculator price={price} currency={vehicle.currency} />
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="specs-title" className="space-y-3">
            <h2 id="specs-title" className="text-xl font-black">
              Ficha técnica
            </h2>
            <dl className="grid grid-cols-2 gap-px border-2 border-black bg-black dark:border-white dark:bg-white">
              {specs.map((spec) => (
                <div key={spec.label} className="bg-white p-4 dark:bg-neutral-950">
                  <dt className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                    {spec.label}
                  </dt>
                  <dd className="text-base font-black">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {vehicle.features.length > 0 ? (
            <section aria-labelledby="features-title" className="space-y-3">
              <h2 id="features-title" className="text-xl font-black">
                Equipamiento
              </h2>
              <ul className="flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 border-2 px-3 py-2 text-sm font-bold"
                    style={{ borderColor: "var(--brand-primary)" }}
                  >
                    <Check className="h-4 w-4" /> {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {vehicle.description ? (
            <section aria-labelledby="description-title" className="space-y-3">
              <h2 id="description-title" className="text-xl font-black">
                Descripción
              </h2>
              <p className="whitespace-pre-line leading-relaxed">{vehicle.description}</p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
