import { toFullMatchRegex } from "./regexUtils";

export type TagCounts = ReadonlyMap<string, number> | Record<string, number>;

function tagsEqual(a: string[], b: string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function getTagCount(tag: string, counts: TagCounts): number {
  if (counts instanceof Map) {
    return counts.get(tag) ?? 0;
  }
  return counts[tag] ?? 0;
}

export function addTags(tags: string[], tagsToAdd: string[]): string[] {
  if (tagsToAdd.length === 0) {
    return tags;
  }
  return tags.concat(tagsToAdd);
}

export function removeTags(tags: string[], tagsToRemove: string[]): string[] {
  if (tagsToRemove.length === 0) {
    return tags;
  }
  const removeSet = new Set(tagsToRemove);
  const next = tags.filter((tag) => !removeSet.has(tag));
  return tagsEqual(tags, next) ? tags : next;
}

export function renameTags(
  tags: string[],
  oldTags: string[],
  newTag: string
): string[] {
  if (oldTags.length === 0) {
    return tags;
  }
  const oldSet = new Set(oldTags);
  let changed = false;
  const next = tags.map((tag) => {
    if (oldSet.has(tag)) {
      changed = true;
      return newTag;
    }
    return tag;
  });
  return changed ? next : tags;
}

export function renameTagsByRegex(
  tags: string[],
  pattern: RegExp,
  newTag: string
): string[] {
  const fullMatch = toFullMatchRegex(pattern);
  let changed = false;
  const next = tags.map((tag) => {
    if (fullMatch.test(tag)) {
      changed = true;
      return newTag;
    }
    return tag;
  });
  return changed ? next : tags;
}

export function removeTagsByRegex(tags: string[], pattern: RegExp): string[] {
  const fullMatch = toFullMatchRegex(pattern);
  const next = tags.filter((tag) => !fullMatch.test(tag));
  return tagsEqual(tags, next) ? tags : next;
}

export function sortTagsAlphabetically(
  tags: string[],
  keepFirst: boolean
): string[] {
  if (tags.length < 2) {
    return tags;
  }
  const next = keepFirst
    ? [tags[0], ...tags.slice(1).sort((a, b) => a.localeCompare(b))]
    : [...tags].sort((a, b) => a.localeCompare(b));
  return tagsEqual(tags, next) ? tags : next;
}

export function sortTagsByFrequency(
  tags: string[],
  counts: TagCounts,
  keepFirst: boolean
): string[] {
  if (tags.length < 2) {
    return tags;
  }
  const sorter = (a: string, b: string) =>
    getTagCount(b, counts) - getTagCount(a, counts);
  const next = keepFirst
    ? [tags[0], ...tags.slice(1).sort(sorter)]
    : [...tags].sort(sorter);
  return tagsEqual(tags, next) ? tags : next;
}

export function reverseTags(tags: string[], keepFirst: boolean): string[] {
  if (tags.length < 2) {
    return tags;
  }
  const next = keepFirst
    ? [tags[0], ...tags.slice(1).reverse()]
    : [...tags].reverse();
  return tagsEqual(tags, next) ? tags : next;
}

export function shuffleTags(
  tags: string[],
  keepFirst: boolean,
  rng: () => number = Math.random
): string[] {
  if (tags.length < 2) {
    return tags;
  }
  const startIndex = keepFirst ? 1 : 0;
  const next = [...tags];
  for (let i = next.length - 1; i > startIndex; i -= 1) {
    const j = Math.floor(rng() * (i - startIndex + 1)) + startIndex;
    [next[i], next[j]] = [next[j], next[i]];
  }
  return tagsEqual(tags, next) ? tags : next;
}

export function moveTagsToFront(
  tags: string[],
  tagsToMove: string[]
): string[] {
  if (tagsToMove.length === 0) {
    return tags;
  }
  const moveSet = new Set(tagsToMove);
  if (!tags.some((tag) => moveSet.has(tag))) {
    return tags;
  }
  const moved: string[] = [];
  for (const tag of tagsToMove) {
    let count = 0;
    for (const candidate of tags) {
      if (candidate === tag) {
        count += 1;
      }
    }
    for (let i = 0; i < count; i += 1) {
      moved.push(tag);
    }
  }
  const unmoved = tags.filter((tag) => !moveSet.has(tag));
  return moved.concat(unmoved);
}

export function removeDuplicateTags(tags: string[]): string[] {
  const seen = new Set<string>();
  let changed = false;
  const next = tags.filter((tag) => {
    if (seen.has(tag)) {
      changed = true;
      return false;
    }
    seen.add(tag);
    return true;
  });
  return changed ? next : tags;
}

export function removeEmptyTags(tags: string[]): string[] {
  const next = tags.filter((tag) => tag.trim().length > 0);
  return tagsEqual(tags, next) ? tags : next;
}
