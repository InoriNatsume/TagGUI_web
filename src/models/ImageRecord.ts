export type ImageId = string;

export interface ImageSource {
  fileHandle: FileSystemFileHandle;
  directoryHandle: FileSystemDirectoryHandle;
  fileName: string;
  relativePath: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageRecord {
  id: ImageId;
  source: ImageSource;
  tags: string[];
  dimensions?: ImageDimensions;
}
