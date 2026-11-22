"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { readableTextColor, safeBrandColor } from "@/lib/color";
import { formatKm, formatPrice, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicle-ui";
import type { CurrencyValue, FuelValue, StatusValue, TransmissionValue } from "@/lib/validators/vehicle";

export interface StoryVehicle {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  price: number;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  status: StatusValue;
  coverUrl: string | null;
}

export interface StoryBranding {
  name: string;
  primaryColor: string;
  hasLogo: boolean;
  whatsappNumber: string | null;
  instagramHandle: string | null;
  city: string | null;
}

type Theme = "dark" | "light";

interface DrawInput {
  vehicle: StoryVehicle;
  branding: StoryBranding;
  theme: Theme;
  cover: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const FALLBACK_FONT = '"Plus Jakarta Sans", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Se reemplaza por la fuente real de la página (next/font) antes de dibujar. */
let FONT = FALLBACK_FONT;

const PALETTES: Record<Theme, { bg: string; fg: string; muted: string }> = {
  dark: { bg: "#0A0A0A", fg: "#FFFFFF", muted: "#A3A3A3" },
  light: { bg: "#FAFAF7", fg: "#0A0A0A", muted: "#525252" },
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

/** Achica la tipografía hasta que el texto entre; si no alcanza, lo corta con "…". */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  maxSize: number,
  minSize: number,
  maxWidth: number,
): string {
  let size = maxSize;
  setFont(ctx, weight, size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    setFont(ctx, weight, size);
  }
  let output = text;
  while (output.length > 1 && ctx.measureText(output).width > maxWidth) {
    output = output.slice(0, -1);
    if (ctx.measureText(`${output}…`).width <= maxWidth) {
      output = `${output}…`;
      break;
    }
  }
  return output;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = value;
}

function drawStory(canvas: HTMLCanvasElement, input: DrawInput): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { vehicle, branding, theme, cover, logo } = input;
  const palette = PALETTES[theme];
  const brand = safeBrandColor(branding.primaryColor);
  const onBrand = readableTextColor(brand);
  const marginX = 60;
  const contentWidth = WIDTH - marginX * 2;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = brand;
  ctx.fillRect(0, 0, WIDTH, 18);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Encabezado: logo + agencia (fuera de la zona tapada por la interfaz de Instagram).
  const logoSize = 104;
  const logoY = 230;
  ctx.fillStyle = logo ? "#FFFFFF" : brand;
  ctx.fillRect(marginX, logoY, logoSize, logoSize);
  if (logo) {
    drawContain(ctx, logo, marginX + 8, logoY + 8, logoSize - 16, logoSize - 16);
  } else {
    ctx.fillStyle = onBrand;
    setFont(ctx, 900, 64);
    ctx.textAlign = "center";
    ctx.fillText(branding.name.charAt(0).toUpperCase(), marginX + logoSize / 2, logoY + 74);
    ctx.textAlign = "left";
  }
  ctx.strokeStyle = palette.fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(marginX, logoY, logoSize, logoSize);

  const headerTextX = marginX + logoSize + 28;
  const headerWidth = WIDTH - marginX - headerTextX;
  ctx.fillStyle = palette.fg;
  ctx.fillText(fitText(ctx, branding.name, 900, 50, 30, headerWidth), headerTextX, logoY + 50);
  if (branding.city) {
    ctx.fillStyle = palette.muted;
    ctx.fillText(fitText(ctx, branding.city, 600, 30, 22, headerWidth), headerTextX, logoY + 94);
  }

  // Foto principal con sombra dura del color de marca.
  const photoX = marginX;
  const photoY = 380;
  const photoW = contentWidth;
  const photoH = 720;
  ctx.fillStyle = brand;
  ctx.fillRect(photoX + 18, photoY + 18, photoW, photoH);
  if (cover) {
    drawCover(ctx, cover, photoX, photoY, photoW, photoH);
  } else {
    ctx.fillStyle = theme === "dark" ? "#262626" : "#D4D4D4";
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = palette.muted;
    setFont(ctx, 700, 40);
    ctx.textAlign = "center";
    ctx.fillText("Sin foto", photoX + photoW / 2, photoY + photoH / 2);
    ctx.textAlign = "left";
  }
  ctx.strokeStyle = palette.fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Cinta de estado (reservado / vendido).
  if (vehicle.status === "RESERVED" || vehicle.status === "SOLD") {
    const label = vehicle.status === "RESERVED" ? "RESERVADO" : "VENDIDO";
    setFont(ctx, 900, 40);
    setLetterSpacing(ctx, "4px");
    const ribbonWidth = ctx.measureText(label).width + 64;
    ctx.fillStyle = vehicle.status === "RESERVED" ? "#FBBF24" : "#0A0A0A";
    ctx.fillRect(photoX, photoY + 36, ribbonWidth, 76);
    ctx.fillStyle = vehicle.status === "RESERVED" ? "#0A0A0A" : "#FFFFFF";
    ctx.fillText(label, photoX + 32, photoY + 90);
    setLetterSpacing(ctx, "0px");
  }

  // Badges año / km sobre la foto.
  const badges = [String(vehicle.year), formatKm(vehicle.mileage)];
  let badgeX = photoX;
  const badgeY = photoY + photoH - 76;
  for (const badge of badges) {
    setFont(ctx, 900, 38);
    const badgeWidth = ctx.measureText(badge).width + 56;
    ctx.fillStyle = palette.fg;
    ctx.fillRect(badgeX, badgeY, badgeWidth, 76);
    ctx.fillStyle = palette.bg;
    ctx.fillText(badge, badgeX + 28, badgeY + 53);
    badgeX += badgeWidth + 12;
  }

  // Título.
  ctx.fillStyle = palette.muted;
  setFont(ctx, 800, 38);
  setLetterSpacing(ctx, "6px");
  ctx.fillText(fitText(ctx, vehicle.brand.toUpperCase(), 800, 38, 26, contentWidth), marginX, 1170);
  setLetterSpacing(ctx, "0px");

  ctx.fillStyle = palette.fg;
  ctx.fillText(fitText(ctx, vehicle.model, 900, 118, 56, contentWidth), marginX, 1262);

  if (vehicle.version) {
    ctx.fillStyle = palette.muted;
    ctx.fillText(fitText(ctx, vehicle.version, 600, 40, 26, contentWidth), marginX, 1314);
  }

  // Chips de transmisión y combustible.
  const chips = [TRANSMISSION_LABELS[vehicle.transmission], FUEL_LABELS[vehicle.fuelType]];
  let chipX = marginX;
  const chipY = 1346;
  ctx.lineWidth = 4;
  for (const chip of chips) {
    setFont(ctx, 800, 30);
    const chipWidth = ctx.measureText(chip).width + 48;
    ctx.strokeStyle = palette.fg;
    ctx.strokeRect(chipX, chipY, chipWidth, 58);
    ctx.fillStyle = palette.fg;
    ctx.fillText(chip, chipX + 24, chipY + 40);
    chipX += chipWidth + 14;
  }

  // Precio destacado.
  const priceY = 1436;
  const priceH = 150;
  ctx.fillStyle = brand;
  ctx.fillRect(marginX, priceY, contentWidth, priceH);
  ctx.strokeStyle = palette.fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(marginX, priceY, contentWidth, priceH);
  ctx.fillStyle = onBrand;
  ctx.textAlign = "center";
  ctx.fillText(
    fitText(ctx, formatPrice(vehicle.price, vehicle.currency), 900, 112, 56, contentWidth - 60),
    WIDTH / 2,
    priceY + priceH / 2 + 38,
  );
  ctx.textAlign = "left";

  // Pie: Instagram y WhatsApp.
  const footerY = 1636;
  setFont(ctx, 700, 32);
  ctx.fillStyle = palette.fg;
  if (branding.instagramHandle) {
    const handle = branding.instagramHandle.replace(/^@/, "");
    ctx.fillText(`@${handle}`, marginX, footerY);
  }
  if (branding.whatsappNumber) {
    ctx.textAlign = "right";
    ctx.fillText(`WhatsApp ${branding.whatsappNumber}`, WIDTH - marginX, footerY);
    ctx.textAlign = "left";
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function InstagramStoryGenerator(props: {
  vehicle: StoryVehicle;
  branding: StoryBranding;
  onClose: () => void;
}) {
  const { vehicle, branding, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [assets, setAssets] = useState<{ cover: HTMLImageElement | null; logo: HTMLImageElement | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        FONT = getComputedStyle(document.body).fontFamily || FALLBACK_FONT;
        await document.fonts?.load(`900 96px ${FONT}`);
      } catch {
        // Si la fuente no carga, el canvas usa la tipografía del sistema.
      }
      const [cover, logo] = await Promise.all([
        vehicle.coverUrl
          ? loadImage(`/api/story-assets?type=cover&vehicleId=${encodeURIComponent(vehicle.id)}`)
          : Promise.resolve(null),
        branding.hasLogo ? loadImage("/api/story-assets?type=logo") : Promise.resolve(null),
      ]);
      if (!cancelled) setAssets({ cover, logo });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [vehicle.id, vehicle.coverUrl, branding.hasLogo]);

  useEffect(() => {
    if (!assets || !canvasRef.current) return;
    drawStory(canvasRef.current, { vehicle, branding, theme, cover: assets.cover, logo: assets.logo });
  }, [assets, theme, vehicle, branding]);

  const filename = `historia-${slugify(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`)}.png`;

  function getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function handleDownload(forceFile: boolean) {
    setError(null);
    setBusy(true);
    try {
      const blob = await getBlob();
      if (!blob) {
        setError("No pudimos generar la imagen. Probá de nuevo.");
        return;
      }

      // En el celular se abre el menú de compartir: ahí aparece "Guardar imagen" (galería) e Instagram.
      const file = new File([blob], filename, { type: "image/png" });
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      if (!forceFile && isTouch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${vehicle.brand} ${vehicle.model} ${vehicle.year}` });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }
      triggerDownload(blob, filename);
    } finally {
      setBusy(false);
    }
  }

  const ready = assets !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Placa para historia de Instagram"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[96dvh] w-full max-w-md flex-col gap-4 overflow-y-auto border border-neutral-200 bg-white/85 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-neutral-950/80 shadow-2xl rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold font-display">Placa para historia</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center border border-neutral-300 dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mx-auto aspect-[9/16] h-[52dvh] max-h-[640px] border border-neutral-200 bg-neutral-200 dark:border-white/10 dark:bg-neutral-800 rounded-xl overflow-hidden">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="h-full w-full" aria-label="Vista previa de la placa" />
          {!ready ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Estilo">
          {(["dark", "light"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`h-12 border text-sm font-semibold ${
                theme === value
                  ? "border-transparent bg-neutral-900 text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                  : "border-neutral-200 dark:border-white/10"
              } rounded-xl`}
            >
              {value === "dark" ? "Oscura" : "Clara"}
            </button>
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void handleDownload(false)}
          className="flex h-12 items-center justify-center gap-2 border border-transparent bg-neutral-900 text-base font-semibold text-white disabled:opacity-50 dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Descargar placa para historia
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void handleDownload(true)}
          className="h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-50"
        >
          Solo bajar el archivo .png
        </button>
      </div>
    </div>
  );
}
