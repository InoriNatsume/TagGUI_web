import { ImageDimensions } from "../models/ImageRecord";

export async function readImageDimensionsFromHandle(
  handle: FileSystemFileHandle
): Promise<ImageDimensions | null> {
  try {
    const file = await handle.getFile();
    return await readImageDimensionsFromFile(file);
  } catch {
    return null;
  }
}

export async function readImageDimensionsFromFile(
  file: File
): Promise<ImageDimensions | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      const dimensions = { width: bitmap.width, height: bitmap.height };
      if (typeof bitmap.close === "function") {
        bitmap.close();
      }
      return dimensions;
    } catch {
      return await readImageDimensionsFromElement(file);
    }
  }
  return await readImageDimensionsFromElement(file);
}

function readImageDimensionsFromElement(
  file: File
): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
