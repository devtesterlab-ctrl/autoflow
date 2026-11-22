import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { BRAND_BUTTON_STYLE } from "@/components/catalog/brand-style";
import { readableTextColor, safeBrandColor } from "@/lib/color";
import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";

type LayoutParams = { params: Promise<{ domain: string }> };

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) return { title: "Catálogo no encontrado" };

  const origin = getTenantOrigin(tenant);
  const title = `${tenant.name} · Autos usados`;
  const description = `Catálogo de autos usados de ${tenant.name}${tenant.city ? ` en ${tenant.city}` : ""}. Consultá por WhatsApp.`;

  return {
    metadataBase: new URL(origin),
    title: { default: title, template: `%s · ${tenant.name}` },
    description,
    icons: tenant.logoUrl ? { icon: tenant.logoUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: tenant.name,
      locale: "es_AR",
      url: origin,
      title,
      description,
      images: tenant.logoUrl ? [{ url: tenant.logoUrl }] : undefined,
    },
  };
}

export async function generateViewport({ params }: LayoutParams): Promise<Viewport> {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  return { themeColor: safeBrandColor(tenant?.primaryColor) };
}

export default async function SiteLayout({ children, params }: { children: ReactNode } & LayoutParams) {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) notFound();

  const brand = safeBrandColor(tenant.primaryColor);
  const style = {
    "--brand-primary": brand,
    "--brand-primary-foreground": readableTextColor(brand),
  } as CSSProperties;

  const whatsappNumber = normalizeWhatsappNumber(tenant.whatsappNumber);
  const whatsappUrl = whatsappNumber
    ? buildWhatsappUrl(whatsappNumber, `Hola ${tenant.name}! Vi su catálogo y quiero hacer una consulta.`)
    : null;

  const instagram = (tenant.instagramHandle ?? "").replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  const mapsQuery = [tenant.address, tenant.city].filter(Boolean).join(", ");

  return (
    <div style={style} className="min-h-dvh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/60">
        <div className="h-1.5" style={{ backgroundColor: "var(--brand-primary)" }} />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-10 w-10 shrink-0 object-contain" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center border text-lg font-bold rounded-xl bg-white dark:bg-white/5"
                style={BRAND_BUTTON_STYLE}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight">{tenant.name}</span>
          </Link>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 shrink-0 items-center gap-2 border px-4 text-sm font-bold rounded-xl bg-white dark:bg-white/5"
              style={BRAND_BUTTON_STYLE}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          ) : null}
        </div>
      </header>

      {children}

      <footer className="border-t border-neutral-200 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-bold">{tenant.name}</p>
            {mapsQuery ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline underline-offset-4"
              >
                <MapPin className="h-4 w-4" /> {mapsQuery}
              </a>
            ) : null}
            {instagram ? (
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline underline-offset-4"
              >
                <AtSign className="h-4 w-4" /> {instagram}
              </a>
            ) : null}
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Catálogo con AutoFlow</p>
        </div>
      </footer>
    </div>
  );
}
