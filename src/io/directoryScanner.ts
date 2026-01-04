import { getExtension, joinPath, normalizeExtension } from "./pathUtils";

export interface ScanOptions {
  allowedExtensions: string[];
  includeSubdirectories?: boolean;
}

export interface ScannedFile {
  fileHandle: FileSystemFileHandle;
  directoryHandle: FileSystemDirectoryHandle;
  fileName: string;
  relativePath: string;
}

export async function scanDirectory(
  rootHandle: FileSystemDirectoryHandle,
  options: ScanOptions
): Promise<ScannedFile[]> {
  const includeSubdirectories = options.includeSubdirectories ?? true;
  const normalizedExtensions = new Set(
    options.allowedExtensions.map(normalizeExtension)
  );
  const results: ScannedFile[] = [];

  async function walk(
    directoryHandle: FileSystemDirectoryHandle,
    parentPath: string
  ): Promise<void> {
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === "file") {
        const extension = getExtension(name);
        if (
          normalizedExtensions.size === 0 ||
          normalizedExtensions.has(extension)
        ) {
          results.push({
            fileHandle: handle,
            directoryHandle,
            fileName: name,
            relativePath: joinPath(parentPath, name),
          });
        }
        continue;
      }
      if (handle.kind === "directory" && includeSubdirectories) {
        await walk(handle, joinPath(parentPath, name));
      }
    }
  }

  await walk(rootHandle, "");
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
}
