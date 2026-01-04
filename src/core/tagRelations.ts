import { ImageRecord } from "../models/ImageRecord";
import { TagChange } from "../models/TagChange";
import { includeAll, ScopePredicate } from "./scope";
import { updateImagesInScope } from "./tagBatch";

export interface AbstractTagPair {
  abstractTag: string;
  concreteTag: string;
}

export interface AbstractTagPairStat extends AbstractTagPair {
  count: number;
  imageIds: string[];
}

function buildPairKey(abstractTag: string, concreteTag: string): string {
  return `${abstractTag}\u0000${concreteTag}`;
}

function tokenize(tag: string): string[] {
  return tag
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
}

function containsTokenSequence(concreteTag: string, abstractTag: string): boolean {
  const abstractTokens = tokenize(abstractTag);
  const concreteTokens = tokenize(concreteTag);
  if (abstractTokens.length === 0) {
    return false;
  }
  if (abstractTokens.length > concreteTokens.length) {
    return false;
  }
  for (
    let start = 0;
    start <= concreteTokens.length - abstractTokens.length;
    start += 1
  ) {
    let matches = true;
    for (let offset = 0; offset < abstractTokens.length; offset += 1) {
      if (concreteTokens[start + offset] !== abstractTokens[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }
  return false;
}

export function findAbstractTagPairs(tags: string[]): AbstractTagPair[] {
  const uniqueTags = Array.from(new Set(tags)).filter((tag) => tag.length > 0);
  if (uniqueTags.length < 2) {
    return [];
  }
  const sorted = uniqueTags.slice().sort((a, b) => a.length - b.length);
  const pairs: AbstractTagPair[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < sorted.length; i += 1) {
    const abstractTag = sorted[i];
    for (let j = i + 1; j < sorted.length; j += 1) {
      const concreteTag = sorted[j];
      if (concreteTag === abstractTag) {
        continue;
      }
      if (!containsTokenSequence(concreteTag, abstractTag)) {
        continue;
      }
      const key = buildPairKey(abstractTag, concreteTag);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push({ abstractTag, concreteTag });
    }
  }
  return pairs;
}

export function collectAbstractTagPairsInImages(
  images: ImageRecord[],
  scope: ScopePredicate = includeAll
): AbstractTagPairStat[] {
  const map = new Map<string, AbstractTagPairStat>();
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!scope(image, index)) {
      continue;
    }
    const pairs = findAbstractTagPairs(image.tags);
    for (const pair of pairs) {
      const key = buildPairKey(pair.abstractTag, pair.concreteTag);
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
        entry.imageIds.push(image.id);
      } else {
        map.set(key, {
          abstractTag: pair.abstractTag,
          concreteTag: pair.concreteTag,
          count: 1,
          imageIds: [image.id],
        });
      }
    }
  }
  return Array.from(map.values());
}

export function removeAbstractTagsByPairsInImages(
  images: ImageRecord[],
  pairs: AbstractTagPair[],
  scope: ScopePredicate = includeAll
): TagChange {
  if (pairs.length === 0) {
    return { images, changedIds: [] };
  }
  const map = new Map<string, Set<string>>();
  for (const pair of pairs) {
    if (!pair.abstractTag || !pair.concreteTag) {
      continue;
    }
    if (!map.has(pair.abstractTag)) {
      map.set(pair.abstractTag, new Set());
    }
    map.get(pair.abstractTag)?.add(pair.concreteTag);
  }
  if (map.size === 0) {
    return { images, changedIds: [] };
  }
  return updateImagesInScope(images, scope, (tags) => {
    if (tags.length === 0) {
      return tags;
    }
    const tagSet = new Set(tags);
    const toRemove = new Set<string>();
    for (const [abstractTag, concreteTags] of map.entries()) {
      if (!tagSet.has(abstractTag)) {
        continue;
      }
      for (const concreteTag of concreteTags) {
        if (tagSet.has(concreteTag)) {
          toRemove.add(abstractTag);
          break;
        }
      }
    }
    if (toRemove.size === 0) {
      return tags;
    }
    return tags.filter((tag) => !toRemove.has(tag));
  });
}
