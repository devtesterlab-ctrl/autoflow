"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import imageCompression from "browser-image-compression";
import { AlertCircle, Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { deleteUploadedObject } from "@/app/dashboard/vehicles/actions";
import { isHeicFile, normalizeImageFile, TRANSPARENT_PIXEL } from "@/lib/image-input";
import { MAX_UPLOAD_BYTES, type PresignedResponse } from "@/lib/validators/upload";
import { MAX_IMAGES_PER_VEHICLE } from "@/lib/validators/vehicle";

export interface ImageItem {
  localId: string;
  /** Key en R2. null hasta que termina la subida. */
  key: string | null;
  url: string;
  isCover: boolean;
  status: "compressing" | "uploading" | "done" | "error";
  progress: number;
  /** true si ya está guardada en la base (se borra recién al guardar el formulario). */
  saved: boolean;
  error?: string;
}

interface ImageUploaderProps {
  vehicleId: string;
  images: ImageItem[];
  onChange: Dispatch<SetStateAction<ImageItem[]>>;
  disabled?: boolean;
}

const CONCURRENCY = 3;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const current = items[next++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error ${xhr.status} al subir la foto`));
    xhr.onerror = () => reject(new Error("Sin conexión al subir la foto"));
    xhr.send(body);
  });
}

export function ImageUploader({ vehicleId, images, onChange, disabled = false }: ImageUploaderProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const patch = (localId: string, changes: Partial<ImageItem>) =>
    onChange((previous) =>
      previous.map((item) => {
        if (item.localId !== localId) return item;
        if (changes.url && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
        return { ...item, ...changes };
      }),
    );

  async function processFile(file: File, localId: string): Promise<void> {
    try {
      // Las fotos HEIC del iPhone se convierten a JPEG antes de optimizarlas.
      const source = await normalizeImageFile(file);
      if (source !== file) patch(localId, { url: URL.createObjectURL(source) });

      const compressed = await imageCompression(source, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.82,
        fileType: "image/webp",
        maxSizeMB: 1.5,
        useWebWorker: true,
      });
      if (compressed.type !== "image/webp") {
        throw new Error("Tu navegador no pudo convertir la foto a WebP");
      }
      if (compressed.size > MAX_UPLOAD_BYTES) {
        throw new Error("La foto sigue siendo demasiado pesada");
      }

      patch(localId, { status: "uploading", progress: 0 });

      const response = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, contentType: "image/webp", size: compressed.size }),
      });
      if (!response.ok) throw new Error("No pudimos preparar la subida");
      const presigned = (await response.json()) as PresignedResponse;

      await putWithProgress(presigned.uploadUrl, compressed, presigned.headers, (percent) =>
        patch(localId, { progress: percent }),
      );

      patch(localId, { status: "done", progress: 100, key: presigned.key, url: presigned.publicUrl });
    } catch (error) {
      patch(localId, {
        status: "error",
        error: error instanceof Error ? error.message : "Error al subir la foto",
      });
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setNotice(null);

    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/") || isHeicFile(file));
    const free = Math.max(0, MAX_IMAGES_PER_VEHICLE - images.length);
    if (files.length > free) setNotice(`Máximo ${MAX_IMAGES_PER_VEHICLE} fotos por auto.`);

    const batch = files.slice(0, free).map((file) => ({ file, localId: crypto.randomUUID() }));
    if (batch.length === 0) return;

    onChange((previous) => {
      let hasCover = previous.some((item) => item.isCover);
      const added: ImageItem[] = batch.map(({ file, localId }) => {
        const isCover = !hasCover;
        hasCover = true;
        return {
          localId,
          key: null,
          url: isHeicFile(file) ? TRANSPARENT_PIXEL : URL.createObjectURL(file),
          isCover,
          status: "compressing",
          progress: 0,
          saved: false,
        };
      });
      return [...previous, ...added];
    });

    void runPool(batch, CONCURRENCY, ({ file, localId }) => processFile(file, localId));
  }

  async function removeImage(item: ImageItem) {
    onChange((previous) => {
      const next = previous.filter((candidate) => candidate.localId !== item.localId);
      if (next.length > 0 && !next.some((candidate) => candidate.isCover)) {
        next[0] = { ...next[0], isCover: true };
      }
      return next;
    });
    if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
    if (!item.saved && item.key) await deleteUploadedObject(item.key);
  }

  const setCover = (localId: string) =>
    onChange((previous) => previous.map((item) => ({ ...item, isCover: item.localId === localId })));

  const move = (index: number, direction: -1 | 1) =>
    onChange((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const full = images.length >= MAX_IMAGES_PER_VEHICLE;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled || full}
          onClick={() => galleryRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 border border-neutral-300 text-base font-semibold active:scale-[0.98] disabled:opacity-40 dark:border-white/20 transition rounded-xl bg-white dark:bg-white/5"
        >
          <ImagePlus className="h-5 w-5" /> Galería
        </button>
        <button
          type="button"
          disabled={disabled || full}
          onClick={() => cameraRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 border border-neutral-300 text-base font-semibold active:scale-[0.98] disabled:opacity-40 dark:border-white/20 transition rounded-xl bg-white dark:bg-white/5"
        >
          <Camera className="h-5 w-5" /> Cámara
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {notice ? <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{notice}</p> : null}

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {images.length} de {MAX_IMAGES_PER_VEHICLE} fotos. La estrella marca la portada.
      </p>

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((item, index) => {
            const busy = item.status === "compressing" || item.status === "uploading";
            return (
              <li key={item.localId} className="overflow-hidden border border-neutral-200 dark:border-white/10 rounded-xl">
                <div className="relative aspect-[4/3] bg-neutral-200 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />

                  {item.isCover ? (
                    <span className="absolute left-2 top-2 bg-neutral-900 px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-md">
                      PORTADA
                    </span>
                  ) : null}

                  {busy ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-black/50 p-3 text-white">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-xs font-semibold">
                        {item.status === "compressing" ? "Optimizando…" : `Subiendo ${item.progress}%`}
                      </span>
                      <div className="h-2 w-full bg-white/30">
                        <div
                          className="h-full bg-white transition-all"
                          style={{ width: `${item.status === "compressing" ? 10 : item.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {item.status === "error" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-700/85 p-3 text-center text-white">
                      <AlertCircle className="h-6 w-6" />
                      <span className="text-xs font-semibold">{item.error ?? "Error al subir"}</span>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-4 border-t border-neutral-200 dark:border-white/10">
                  <button
                    type="button"
                    aria-label="Mover antes"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    className="flex h-11 items-center justify-center disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Marcar como portada"
                    aria-pressed={item.isCover}
                    disabled={disabled || item.status !== "done"}
                    onClick={() => setCover(item.localId)}
                    className="flex h-11 items-center justify-center disabled:opacity-30"
                  >
                    <Star className={`h-5 w-5 ${item.isCover ? "fill-current" : ""}`} />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover después"
                    disabled={disabled || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex h-11 items-center justify-center disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar foto"
                    disabled={disabled || busy}
                    onClick={() => void removeImage(item)}
                    className="flex h-11 items-center justify-center text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
