import { ImageRecord } from "../models/ImageRecord";

export type ScopePredicate = (image: ImageRecord, index: number) => boolean;

export const includeAll: ScopePredicate = () => true;

export function scopeByIds(ids: ReadonlySet<string>): ScopePredicate {
  return (image) => ids.has(image.id);
}
