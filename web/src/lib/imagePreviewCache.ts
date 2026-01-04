import type { ImageRecord } from "@core/models/ImageRecord";

const urlMap = new Map<string, string>();
const promiseMap = new Map<string, Promise<string>>();

export function getImageUrl(image: ImageRecord): Promise<string> {
  const cached = urlMap.get(image.id);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = promiseMap.get(image.id);
  if (pending) {
    return pending;
  }
  const promise = image.source.fileHandle.getFile().then((file) => {
    const url = URL.createObjectURL(file);
    urlMap.set(image.id, url);
    promiseMap.delete(image.id);
    return url;
  });
  promiseMap.set(image.id, promise);
  return promise;
}

export function revokeImageUrl(imageId: string): void {
  const url = urlMap.get(imageId);
  if (url) {
    URL.revokeObjectURL(url);
    urlMap.delete(imageId);
  }
  promiseMap.delete(imageId);
}

export function resetImageCache(): void {
  for (const url of urlMap.values()) {
    URL.revokeObjectURL(url);
  }
  urlMap.clear();
  promiseMap.clear();
}
