import type { ImageRecord } from "@core/models/ImageRecord";
import { countTags } from "@core/core/tagStats";

export interface TagStat {
  tag: string;
  count: number;
}

export function filterImages(
  images: ImageRecord[],
  filterText: string,
  tagFilter: string | null,
  tagSeparator: string
): ImageRecord[] {
  const trimmed = filterText.trim().toLowerCase();
  if (!trimmed && !tagFilter) {
    return images;
  }
  return images.filter((image) => {
    if (tagFilter && !image.tags.includes(tagFilter)) {
      return false;
    }
    if (!trimmed) {
      return true;
    }
    const fileName = image.source.fileName.toLowerCase();
    if (fileName.includes(trimmed)) {
      return true;
    }
    const caption = image.tags.join(tagSeparator).toLowerCase();
    return caption.includes(trimmed);
  });
}

export function buildAllTagsList(
  images: ImageRecord[],
  search: string,
  sortMode: "frequency" | "alphabetical",
  order: "asc" | "desc"
): TagStat[] {
  const counts = countTags(images);
  const query = search.trim().toLowerCase();
  let tags = Array.from(counts.entries()).map(([tag, count]) => ({
    tag,
    count,
  }));
  if (query) {
    tags = tags.filter((item) => item.tag.toLowerCase().includes(query));
  }
  tags.sort((a, b) => {
    if (sortMode === "alphabetical") {
      return a.tag.localeCompare(b.tag);
    }
    return b.count - a.count;
  });
  if (order === "asc") {
    tags.reverse();
  }
  return tags;
}

export function buildCaptionPreview(
  tags: string[],
  separator: string,
  maxLength: number = 110
): string {
  const caption = tags.join(separator);
  if (caption.length <= maxLength) {
    return caption;
  }
  return `${caption.slice(0, maxLength - 3)}...`;
}
