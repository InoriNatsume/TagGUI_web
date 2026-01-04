import { ImageRecord } from "./ImageRecord";

export interface TagChange {
  images: ImageRecord[];
  changedIds: string[];
}
