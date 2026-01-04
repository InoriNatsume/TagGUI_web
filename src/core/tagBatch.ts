import { ImageRecord } from "../models/ImageRecord";
import { TagChange } from "../models/TagChange";
import { includeAll, ScopePredicate } from "./scope";
import {
  addTags,
  moveTagsToFront,
  removeDuplicateTags,
  removeEmptyTags,
  removeTags,
  removeTagsByRegex,
  renameTags,
  renameTagsByRegex,
  reverseTags,
  shuffleTags,
  sortTagsAlphabetically,
  sortTagsByFrequency,
  TagCounts,
} from "./tagEdit";

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

export function updateImagesInScope(
  images: ImageRecord[],
  scope: ScopePredicate,
  update: (tags: string[], image: ImageRecord) => string[] | null
): TagChange {
  const changedIds: string[] = [];
  const nextImages = images.map((image, index) => {
    if (!scope(image, index)) {
      return image;
    }
    const updatedTags = update(image.tags, image);
    if (!updatedTags || tagsEqual(image.tags, updatedTags)) {
      return image;
    }
    changedIds.push(image.id);
    return { ...image, tags: updatedTags };
  });
  return { images: nextImages, changedIds };
}

export function setTagsForImage(
  images: ImageRecord[],
  imageId: string,
  tags: string[]
): TagChange {
  return updateImagesInScope(
    images,
    (image) => image.id === imageId,
    () => tags
  );
}

export function addTagsToImages(
  images: ImageRecord[],
  tagsToAdd: string[],
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    addTags(tags, tagsToAdd)
  );
}

export function renameTagsInImages(
  images: ImageRecord[],
  oldTags: string[],
  newTag: string,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    renameTags(tags, oldTags, newTag)
  );
}

export function renameTagsByRegexInImages(
  images: ImageRecord[],
  pattern: RegExp,
  newTag: string,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    renameTagsByRegex(tags, pattern, newTag)
  );
}

export function deleteTagsInImages(
  images: ImageRecord[],
  tagsToRemove: string[],
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    removeTags(tags, tagsToRemove)
  );
}

export function deleteTagsByRegexInImages(
  images: ImageRecord[],
  pattern: RegExp,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    removeTagsByRegex(tags, pattern)
  );
}

export function sortTagsAlphabeticallyInImages(
  images: ImageRecord[],
  keepFirst: boolean,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    sortTagsAlphabetically(tags, keepFirst)
  );
}

export function sortTagsByFrequencyInImages(
  images: ImageRecord[],
  counts: TagCounts,
  keepFirst: boolean,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    sortTagsByFrequency(tags, counts, keepFirst)
  );
}

export function reverseTagsInImages(
  images: ImageRecord[],
  keepFirst: boolean,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    reverseTags(tags, keepFirst)
  );
}

export function shuffleTagsInImages(
  images: ImageRecord[],
  keepFirst: boolean,
  rng: () => number = Math.random,
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    shuffleTags(tags, keepFirst, rng)
  );
}

export function moveTagsToFrontInImages(
  images: ImageRecord[],
  tagsToMove: string[],
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) =>
    moveTagsToFront(tags, tagsToMove)
  );
}

export function removeDuplicateTagsInImages(
  images: ImageRecord[],
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) => removeDuplicateTags(tags));
}

export function removeEmptyTagsInImages(
  images: ImageRecord[],
  scope: ScopePredicate = includeAll
): TagChange {
  return updateImagesInScope(images, scope, (tags) => removeEmptyTags(tags));
}
