import { readTagsForImage } from "../io/captionStore";
import { scanDirectory } from "../io/directoryScanner";
import { readImageDimensionsFromHandle } from "../io/imageMetadata";
import { ImageRecord, ImageSource } from "../models/ImageRecord";

export const DEFAULT_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".gif",
];

export interface LoadImageOptions {
  tagSeparator: string;
  allowedExtensions?: string[];
  includeSubdirectories?: boolean;
  loadDimensions?: boolean;
}

export async function loadImageSet(
  rootHandle: FileSystemDirectoryHandle,
  options: LoadImageOptions
): Promise<ImageRecord[]> {
  const allowedExtensions =
    options.allowedExtensions ?? DEFAULT_IMAGE_EXTENSIONS;
  const files = await scanDirectory(rootHandle, {
    allowedExtensions,
    includeSubdirectories: options.includeSubdirectories,
  });
  const images: ImageRecord[] = [];
  for (const file of files) {
    const source: ImageSource = {
      fileHandle: file.fileHandle,
      directoryHandle: file.directoryHandle,
      fileName: file.fileName,
      relativePath: file.relativePath,
    };
    const tags = await readTagsForImage(source, options.tagSeparator);
    const dimensions = options.loadDimensions
      ? await readImageDimensionsFromHandle(file.fileHandle)
      : null;
    images.push({
      id: source.relativePath,
      source,
      tags,
      dimensions: dimensions ?? undefined,
    });
  }
  return images;
}
