"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
}

interface VehicleGalleryProps {
  images: GalleryImage[];
  alt: string;
  reserved: boolean;
}

function Lightbox(props: {
  images: GalleryImage[];
  alt: string;
  startIndex: number;
  onClose: (lastIndex: number) => void;
}) {
  const { images, alt, startIndex, onClose } = props;
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = startIndex * track.clientWidth;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [startIndex]);

  const step = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = Math.min(images.length - 1, Math.max(0, index + delta));
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    },
    [images.length, index],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose(index);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, onClose, step]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${alt}`} className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md">
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, position) => (
          <div key={image.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`${alt} - foto ${position + 1}`}
              className="max-h-full max-w-full rounded-xl object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white tabular-nums backdrop-blur-md">
          {index + 1} / {images.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          aria-label="Cerrar galería"
          onClick={() => onClose(index)}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => step(-1)}
            disabled={index === 0}
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 disabled:opacity-25 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() => step(1)}
            disabled={index === images.length - 1}
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 disabled:opacity-25 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function VehicleGallery({ images, alt, reserved }: VehicleGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const goTo = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(images.length - 1, Math.max(0, target));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  const closeLightbox = useCallback((lastIndex: number) => {
    setLightbox(null);
    requestAnimationFrame(() => {
      const track = trackRef.current;
      if (track) track.scrollLeft = lastIndex * track.clientWidth;
      setIndex(lastIndex);
    });
  }, []);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-400 dark:border-white/10 dark:bg-slate-800/80">
        Sin fotos disponibles
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget;
            setIndex(Math.round(track.scrollLeft / track.clientWidth));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Ampliar foto ${position + 1}`}
              onClick={() => setLightbox(position)}
              className="relative aspect-[16/10] w-full shrink-0 snap-center bg-slate-100 dark:bg-slate-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={`${alt} - foto ${position + 1}`}
                loading={position === 0 ? "eager" : "lazy"}
                fetchPriority={position === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        {reserved ? (
          <span className="pointer-events-none absolute left-3.5 top-3.5 rounded-full bg-amber-400 px-3.5 py-1 text-xs font-bold tracking-wider text-slate-950 shadow-xs">
            RESERVADO
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => setLightbox(index)}
          className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white tabular-nums backdrop-blur-md transition-colors hover:bg-slate-950"
        >
          <Expand className="h-3.5 w-3.5" />
          <span>
            {index + 1} / {images.length}
          </span>
        </button>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md backdrop-blur-xs transition-all hover:bg-white disabled:opacity-0 md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md backdrop-blur-xs transition-all hover:bg-white disabled:opacity-0 md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="hidden gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
          {images.map((image, position) => {
            const active = position === index;
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Ir a la foto ${position + 1}`}
                  aria-current={active}
                  onClick={() => goTo(position)}
                  className={`block h-16 w-24 overflow-hidden rounded-xl border-2 transition-all ${
                    active
                      ? "border-slate-900 opacity-100 shadow-2xs dark:border-white"
                      : "border-transparent opacity-55 hover:opacity-85"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {lightbox !== null ? (
        <Lightbox images={images} alt={alt} startIndex={lightbox} onClose={closeLightbox} />
      ) : null}
    </div>
  );
}
