/** Utilidades de entrada de imágenes (solo navegador). Convierte las fotos HEIC/HEIF del iPhone a JPEG. */

/** GIF transparente de 1x1: se usa como vista previa mientras una foto HEIC todavía no se puede mostrar. */
export const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/** En Windows y en Chrome una foto HEIC suele llegar sin tipo MIME, por eso también se mira la extensión. */
export function isHeicFile(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type);
}

/**
 * Devuelve el mismo archivo si no es HEIC. Si lo es, lo convierte a JPEG en el navegador
 * (la librería se descarga recién en ese momento, así no pesa en el resto de la app).
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    const { heicTo } = (await import("heic-to")) as unknown as {
      heicTo: (options: { blob: Blob; type: string; quality?: number }) => Promise<Blob>;
    };
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    return new File([blob], `${file.name.replace(/\.hei[cf]$/i, "")}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.error("[heic] No se pudo convertir", error);
    throw new Error(
      "No pudimos leer esta foto del iPhone (HEIC). Probá compartirla como JPG, o en el iPhone elegí Ajustes > Cámara > Formatos > Más compatible.",
    );
  }
}
