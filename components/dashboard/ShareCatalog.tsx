"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, MessageCircle, Share2 } from "lucide-react";

interface ShareCatalogProps {
  url: string;
  agencyName: string;
  /** false si el dominio de producción todavía no está configurado (la dirección sería de prueba). */
  configured: boolean;
}

type ToDataURL = (
  text: string,
  options?: { width?: number; margin?: number; color?: { dark?: string; light?: string } },
) => Promise<string>;

const BUTTON_CLASS =
  "flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold transition active:scale-[0.98] dark:border-white/20 dark:bg-white/5";

export function ShareCatalog({ url, agencyName, configured }: ShareCatalogProps) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const message = `Mirá los autos de ${agencyName}: ${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = (await import("qrcode")) as unknown as { toDataURL?: ToDataURL; default?: { toDataURL?: ToDataURL } };
        const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
        if (!toDataURL) return;
        const dataUrl = await toDataURL(url, { width: 512, margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" } });
        if (!cancelled) setQr(dataUrl);
      } catch (error) {
        console.error("[qr] No se pudo generar el código", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá este link:", url);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: agencyName, text: message, url });
    } catch {
      // El usuario cerró el menú de compartir: no hay nada que hacer.
    }
  }

  return (
    <section
      aria-labelledby="share-title"
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
    >
      <div className="space-y-1">
        <h2 id="share-title" className="text-xl font-semibold">
          Tu catálogo público
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Este es el link que tenés que compartir con tus clientes. Muestra solo los autos disponibles y reservados.
        </p>
      </div>

      {!configured ? (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Esta dirección es de prueba: todavía no está configurado tu dominio de producción. Revisá la variable
          NEXT_PUBLIC_ROOT_DOMAIN en Vercel y volvé a desplegar.
        </p>
      ) : null}

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Link de tu catálogo"
          className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-neutral-400 dark:border-white/20 dark:bg-white/5"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
          <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
        </a>
        {canShare ? (
          <button type="button" onClick={() => void nativeShare()} className={BUTTON_CLASS}>
            <Share2 className="h-4 w-4" /> Compartir…
          </button>
        ) : null}
        <a href={url} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
          <ExternalLink className="h-4 w-4" /> Abrir catálogo
        </a>
      </div>

      {qr ? (
        <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR de tu catálogo" className="h-28 w-28 shrink-0 rounded-lg bg-white" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Código QR</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Imprimilo y pegalo en la vidriera, en el mostrador o en tus tarjetas: quien lo escanea con el celular
              abre tu catálogo.
            </p>
            <a href={qr} download="qr-catalogo.png" className={`${BUTTON_CLASS} w-fit`}>
              <Download className="h-4 w-4" /> Descargar QR
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
