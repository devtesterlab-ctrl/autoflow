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
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${alt}`} className="fixed inset-0 z-50 bg-black">
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, position) => (
          <div key={image.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`${alt} - foto ${position + 1}`}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <span className="bg-black/70 px-3 py-2 text-sm font-semibold text-white rounded-md">
          {index + 1} / {images.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          aria-label="Cerrar galería"
          onClick={() => onClose(index)}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center bg-white text-black"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => step(-1)}
            disabled={index === 0}
            className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-white text-black disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() => step(1)}
            disabled={index === images.length - 1}
            className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-white text-black disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-6 w-6" />
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
      <div className="flex aspect-[4/3] items-center justify-center border border-neutral-200 bg-neutral-200 text-sm font-medium text-neutral-500 dark:border-white/10 dark:bg-neutral-800 rounded-xl overflow-hidden">
        Sin fotos
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden border border-neutral-200 dark:border-white/10 rounded-2xl">
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
              className="relative aspect-[4/3] w-full shrink-0 snap-center bg-neutral-200 dark:bg-neutral-800"
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
          <span className="pointer-events-none absolute left-3 top-3 bg-amber-400 px-4 py-2 text-sm font-bold tracking-wider text-black rounded-full">
            RESERVADO
          </span>
        ) : null}

        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 bg-black/70 px-3 py-2 text-sm font-semibold text-white rounded-md">
          <Expand className="h-4 w-4" /> {index + 1} / {images.length}
        </span>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-white text-black disabled:opacity-30 md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-white text-black disabled:opacity-30 md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="hidden gap-2 overflow-x-auto md:flex">
          {images.map((image, position) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Ir a la foto ${position + 1}`}
                aria-current={position === index}
                onClick={() => goTo(position)}
                className={`block h-16 w-24 border ${
                  position === index ? "border-neutral-200 dark:border-white/10" : "border-transparent opacity-60"
                } rounded-xl`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox !== null ? (
        <Lightbox images={images} alt={alt} startIndex={lightbox} onClose={closeLightbox} />
      ) : null}
    </div>
  );
}
