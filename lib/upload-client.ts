/** PUT directo a una URL firmada de R2 con progreso (XMLHttpRequest, porque fetch no reporta subida). */
export function putWithProgress(
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
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error ${xhr.status} al subir el archivo`));
    xhr.onerror = () => reject(new Error("Sin conexión al subir el archivo"));
    xhr.send(body);
  });
}
