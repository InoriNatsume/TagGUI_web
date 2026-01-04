import { ImageRecord } from "../models/ImageRecord";
import { TagChange } from "../models/TagChange";
import { formatCaption, splitCaption } from "./captionFormat";
import { buildFullMatchRegex, buildGlobalRegex } from "./regexUtils";
import { includeAll, ScopePredicate } from "./scope";

export interface TextSearchOptions {
  tagSeparator: string;
  scope?: ScopePredicate;
  wholeTagsOnly?: boolean;
  useRegex?: boolean;
  regexFlags?: string;
}

export interface FindReplaceOptions {
  tagSeparator: string;
  scope?: ScopePredicate;
  useRegex?: boolean;
  regexFlags?: string;
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function countRegexMatches(text: string, pattern: RegExp): number {
  const matches = text.match(buildGlobalRegex(pattern.source, pattern.flags));
  return matches ? matches.length : 0;
}

export function getTextMatchCount(
  images: ImageRecord[],
  text: string,
  options: TextSearchOptions
): number {
  const scope = options.scope ?? includeAll;
  const wholeTagsOnly = options.wholeTagsOnly ?? false;
  const useRegex = options.useRegex ?? false;
  if (!text) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!scope(image, index)) {
      continue;
    }
    if (wholeTagsOnly) {
      if (useRegex) {
        const fullMatch = buildFullMatchRegex(text, options.regexFlags);
        total += image.tags.filter((tag) => fullMatch.test(tag)).length;
      } else {
        total += image.tags.filter((tag) => tag === text).length;
      }
      continue;
    }
    const caption = formatCaption(image.tags, options.tagSeparator);
    if (useRegex) {
      const regex = buildRegexForSearch(text, options.regexFlags);
      total += countRegexMatches(caption, regex);
    } else {
      total += countOccurrences(caption, text);
    }
  }
  return total;
}

function buildRegexForSearch(pattern: string, flags?: string): RegExp {
  return buildGlobalRegex(pattern, flags);
}

function replaceAllLiteral(text: string, findText: string, replaceText: string): string {
  if (!findText) {
    return text;
  }
  return text.split(findText).join(replaceText);
}

export function findAndReplaceInImages(
  images: ImageRecord[],
  findText: string,
  replaceText: string,
  options: FindReplaceOptions
): TagChange {
  if (!findText) {
    return { images, changedIds: [] };
  }
  const scope = options.scope ?? includeAll;
  const useRegex = options.useRegex ?? false;
  const regexFlags = options.regexFlags;
  const changedIds: string[] = [];
  const nextImages = images.map((image, index) => {
    if (!scope(image, index)) {
      return image;
    }
    const caption = formatCaption(image.tags, options.tagSeparator);
    let nextCaption = caption;
    if (useRegex) {
      const regex = buildRegexForSearch(findText, regexFlags);
      if (!regex.test(caption)) {
        return image;
      }
      regex.lastIndex = 0;
      nextCaption = caption.replace(regex, replaceText);
    } else {
      if (!caption.includes(findText)) {
        return image;
      }
      nextCaption = replaceAllLiteral(caption, findText, replaceText);
    }
    if (nextCaption === caption) {
      return image;
    }
    const nextTags = splitCaption(
      nextCaption,
      options.tagSeparator,
      false
    );
    changedIds.push(image.id);
    return { ...image, tags: nextTags };
  });
  return { images: nextImages, changedIds };
}
