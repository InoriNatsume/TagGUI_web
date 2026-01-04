export function splitCaption(
  caption: string,
  separator: string,
  trim: boolean = true
): string[] {
  if (!caption) {
    return [];
  }
  const parts = caption.split(separator);
  if (!trim) {
    return parts;
  }
  return parts.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

export function parseCaption(caption: string, separator: string): string[] {
  return splitCaption(caption, separator, true);
}

export function formatCaption(tags: string[], separator: string): string {
  return tags.join(separator);
}
