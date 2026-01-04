import { formatCaption, parseCaption } from "../core/captionFormat";
import { ImageSource } from "../models/ImageRecord";
import { stripExtension } from "./pathUtils";

async function getCaptionHandle(
  directoryHandle: FileSystemDirectoryHandle,
  imageFileName: string,
  create: boolean
): Promise<FileSystemFileHandle | null> {
  const baseName = stripExtension(imageFileName);
  const captionName = `${baseName}.txt`;
  try {
    return await directoryHandle.getFileHandle(captionName, { create });
  } catch {
    return null;
  }
}

export async function readCaptionText(
  directoryHandle: FileSystemDirectoryHandle,
  imageFileName: string
): Promise<string> {
  const captionHandle = await getCaptionHandle(
    directoryHandle,
    imageFileName,
    false
  );
  if (!captionHandle) {
    return "";
  }
  const file = await captionHandle.getFile();
  return file.text();
}

export async function readTagsForImage(
  source: ImageSource,
  tagSeparator: string
): Promise<string[]> {
  const caption = await readCaptionText(
    source.directoryHandle,
    source.fileName
  );
  return parseCaption(caption, tagSeparator);
}

export async function writeCaptionText(
  directoryHandle: FileSystemDirectoryHandle,
  imageFileName: string,
  caption: string
): Promise<void> {
  const captionHandle = await getCaptionHandle(
    directoryHandle,
    imageFileName,
    true
  );
  if (!captionHandle) {
    return;
  }
  const writable = await captionHandle.createWritable();
  await writable.write(caption);
  await writable.close();
}

export async function writeTagsForImage(
  source: ImageSource,
  tags: string[],
  tagSeparator: string
): Promise<void> {
  const caption = formatCaption(tags, tagSeparator);
  await writeCaptionText(source.directoryHandle, source.fileName, caption);
}
