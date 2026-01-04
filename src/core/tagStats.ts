import { ImageRecord } from "../models/ImageRecord";
import { includeAll, ScopePredicate } from "./scope";

export function countTags(
  images: ImageRecord[],
  scope: ScopePredicate = includeAll
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!scope(image, index)) {
      continue;
    }
    for (const tag of image.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

export function tagCountsToRecord(
  counts: Map<string, number>
): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [tag, count] of counts.entries()) {
    record[tag] = count;
  }
  return record;
}
