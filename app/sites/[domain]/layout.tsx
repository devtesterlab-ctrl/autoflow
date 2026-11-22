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
    <div style={style} className="flex min-h-dvh flex-col bg-[#F8FAFC] text-slate-900 dark:bg-[#090A0F] dark:text-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#090A0F]/80">
        <div className="h-1 w-full" style={{ backgroundColor: "var(--brand-primary)" }} />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200/80 bg-white object-contain p-0.5 dark:border-white/10"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-2xs transition-transform group-hover:scale-105"
                style={BRAND_BUTTON_STYLE}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <span className="block truncate font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {tenant.name}
              </span>
              {tenant.city ? (
                <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tenant.city}
                </span>
              ) : null}
            </div>
          </Link>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
              style={BRAND_BUTTON_STYLE}
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          ) : null}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-12 border-t border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0D0F16]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-2.5">
            <p className="font-display text-base font-bold text-slate-900 dark:text-white">{tenant.name}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-600 dark:text-slate-400">
              {mapsQuery ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{mapsQuery}</span>
                </a>
              ) : null}
              {instagram ? (
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <AtSign className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{instagram}</span>
                </a>
              ) : null}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Showroom impulsado por AutoFlow</p>
        </div>
      </footer>
    </div>
  );
}
