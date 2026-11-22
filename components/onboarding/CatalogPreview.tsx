import { readableTextColor, safeBrandColor } from "@/lib/color";

interface CatalogPreviewProps {
  name: string;
  logoUrl: string | null;
  color: string;
  city: string;
  hasWhatsapp: boolean;
}

export function CatalogPreview({ name, logoUrl, color, city, hasWhatsapp }: CatalogPreviewProps) {
  const brand = safeBrandColor(color);
  const foreground = readableTextColor(brand);
  const displayName = name.trim() || "Tu agencia";
  const brandStyle = { backgroundColor: brand, color: foreground, borderColor: brand };

  return (
    <div
      aria-label="Vista previa del catálogo"
      className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-slate-200/90 bg-[#F8FAFC] text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#090A0F] dark:text-slate-50"
    >
      <div className="h-1" style={{ backgroundColor: brand }} />

      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-[#11131C]">
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-lg border border-slate-200/80 bg-white object-contain p-0.5 dark:border-white/10" />
          ) : (
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={brandStyle}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate font-display text-xs font-bold">{displayName}</span>
        </div>
        {hasWhatsapp ? (
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={brandStyle}>
            WhatsApp
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-3.5">
        <div>
          <p className="font-display text-base font-bold leading-tight">Vehículos disponibles</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {city.trim() ? `Unidades en ${city.trim()}. ` : ""}Consultá por WhatsApp.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-white/10 dark:bg-[#11131C]">
          <div className="relative aspect-[16/10] bg-slate-200/70 dark:bg-slate-800">
            <span className="absolute left-2.5 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider" style={brandStyle}>
              DESTACADO
            </span>
          </div>
          <div className="space-y-2 p-3">
            <div>
              <p className="font-display text-sm font-bold">Toyota Corolla</p>
              <p className="text-[10px] font-medium text-slate-500 tabular-nums dark:text-slate-400">
                2021 · 48.500 km · Automática
              </p>
            </div>
            <div className="border-t border-slate-100 pt-2 dark:border-white/5">
              <p className="font-display text-base font-bold tabular-nums">USD 22.900</p>
            </div>
            <span className="block rounded-lg py-1.5 text-center text-[11px] font-bold" style={brandStyle}>
              Consultar por WhatsApp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
