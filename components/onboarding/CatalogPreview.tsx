import { readableTextColor, safeBrandColor } from "@/lib/color";

interface CatalogPreviewProps {
  name: string;
  logoUrl: string | null;
  color: string;
  city: string;
  hasWhatsapp: boolean;
}

/** Maqueta fiel del catálogo público: usa el mismo esquema de color de marca que el layout real. */
export function CatalogPreview({ name, logoUrl, color, city, hasWhatsapp }: CatalogPreviewProps) {
  const brand = safeBrandColor(color);
  const foreground = readableTextColor(brand);
  const displayName = name.trim() || "Tu agencia";
  const brandStyle = { backgroundColor: brand, color: foreground, borderColor: brand };

  return (
    <div
      aria-label="Vista previa del catálogo"
      className="mx-auto w-full max-w-[300px] border-2 border-black bg-white text-neutral-950 dark:border-white dark:bg-neutral-950 dark:text-neutral-50"
    >
      <div className="h-1.5" style={{ backgroundColor: brand }} />

      <div className="flex items-center justify-between gap-2 border-b-2 border-black p-3 dark:border-white">
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
          ) : (
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center border-2 text-sm font-black" style={brandStyle}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-sm font-black">{displayName}</span>
        </div>
        {hasWhatsapp ? (
          <span className="shrink-0 border-2 px-2 py-1 text-[10px] font-black" style={brandStyle}>
            WhatsApp
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <div>
          <p className="text-lg font-black leading-tight">Autos usados</p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400">{city.trim() ? `${city.trim()} · ` : ""}Consultá por WhatsApp</p>
        </div>

        <div className="border-2 border-black dark:border-white">
          <div className="relative aspect-[4/3] bg-neutral-200 dark:bg-neutral-800">
            <span className="absolute left-0 top-2 px-2 py-1 text-[9px] font-black tracking-widest" style={brandStyle}>
              DESTACADO
            </span>
          </div>
          <div className="space-y-2 p-2">
            <p className="text-sm font-black">Toyota Corolla</p>
            <ul className="flex gap-1 text-[10px] font-bold">
              <li className="border-2 border-black px-1.5 py-0.5 dark:border-white">2021</li>
              <li className="border-2 border-black px-1.5 py-0.5 dark:border-white">48.500 km</li>
            </ul>
            <p className="text-lg font-black">USD 22.900</p>
            <span className="block border-2 py-2 text-center text-xs font-black" style={brandStyle}>
              Consultar por este auto
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
