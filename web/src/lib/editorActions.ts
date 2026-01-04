import { get } from "svelte/store";
import { scopeByIds } from "@core/core/scope";
import { splitCaption } from "@core/core/captionFormat";
import {
  addTagsToImages,
  deleteTagsByRegexInImages,
  deleteTagsInImages,
  moveTagsToFrontInImages,
  removeDuplicateTagsInImages,
  removeEmptyTagsInImages,
  renameTagsByRegexInImages,
  renameTagsInImages,
  reverseTagsInImages,
  setTagsForImage,
  shuffleTagsInImages,
  sortTagsAlphabeticallyInImages,
  sortTagsByFrequencyInImages,
} from "@core/core/tagBatch";
import { findAndReplaceInImages, getTextMatchCount } from "@core/core/tagSearch";
import { countTags } from "@core/core/tagStats";
import {
  removeAbstractTagsByPairsInImages,
  type AbstractTagPair,
} from "@core/core/tagRelations";
import { UndoRedoStack } from "@core/core/undoRedoStack";
import { writeTagsForImage } from "@core/io/captionStore";
import { loadImageSet } from "@core/usecases/loadImageSet";
import type { TagChange } from "@core/models/TagChange";
import { editorState, type EditorState } from "./editorStore";
import { buildScopePredicate } from "./scopeUtils";
import { resetImageCache } from "./imagePreviewCache";
import {
  loadPresetPairs,
  mergePresetPairs,
  savePresetPairs,
} from "./presetStore";

let history = new UndoRedoStack(32);

function setError(message: string | null): void {
  editorState.update((state) => ({
    ...state,
    errorMessage: message,
  }));
}

function parseTagInput(text: string, separator: string): string[] {
  return splitCaption(text, separator, true);
}

function getScopePredicate(state: EditorState) {
  return buildScopePredicate(state);
}

function applyTagChange(
  actionName: string,
  shouldConfirm: boolean,
  previousImages: EditorState["images"],
  change: TagChange
): void {
  if (change.changedIds.length === 0) {
    return;
  }
  history.pushSnapshot(actionName, previousImages, shouldConfirm);
  const canUndo = Boolean(history.peekUndo());
  const canRedo = Boolean(history.peekRedo());
  editorState.update((state) => {
    const dirtyIds = new Set(state.dirtyIds);
    for (const id of change.changedIds) {
      dirtyIds.add(id);
    }
    return {
      ...state,
      images: change.images,
      dirtyIds,
      canUndo,
      canRedo,
    };
  });
}

export function updateState(patch: Partial<EditorState>): void {
  editorState.update((state) => ({
    ...state,
    ...patch,
  }));
}

export async function openDirectory(): Promise<void> {
  setError(null);
  const picker = (
    window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) {
    setError("File System Access API is not available in this browser.");
    return;
  }
  try {
    const state = get(editorState);
    const dirHandle = await picker();
    resetImageCache();
    const images = await loadImageSet(dirHandle, {
      tagSeparator: state.tagSeparator,
      includeSubdirectories: true,
      loadDimensions: true,
    });
    const presetPairs = await loadPresetPairs(dirHandle);
    history = new UndoRedoStack(32);
    editorState.set({
      ...state,
      images,
      rootHandle: dirHandle,
      presetPairs,
      activeId: images[0]?.id ?? null,
      selectedIds: new Set(images[0] ? [images[0].id] : []),
      dirtyIds: new Set<string>(),
      canUndo: false,
      canRedo: false,
      errorMessage: null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    setError("Failed to open directory.");
  }
}

export async function saveDirty(): Promise<void> {
  setError(null);
  const state = get(editorState);
  const dirtyIds = new Set(state.dirtyIds);
  if (dirtyIds.size === 0) {
    return;
  }
  try {
    for (const image of state.images) {
      if (dirtyIds.has(image.id)) {
        await writeTagsForImage(image.source, image.tags, state.tagSeparator);
      }
    }
    editorState.update((current) => {
      const remaining = new Set(current.dirtyIds);
      for (const id of dirtyIds) {
        remaining.delete(id);
      }
      return { ...current, dirtyIds: remaining };
    });
  } catch {
    setError("Failed to save captions. Check file permissions.");
  }
}

export function selectOnly(imageId: string): void {
  editorState.update((state) => ({
    ...state,
    activeId: imageId,
    selectedIds: new Set([imageId]),
  }));
}

export function toggleSelection(imageId: string): void {
  editorState.update((state) => {
    const next = new Set(state.selectedIds);
    if (next.has(imageId)) {
      next.delete(imageId);
    } else {
      next.add(imageId);
    }
    return {
      ...state,
      activeId: state.activeId ?? imageId,
      selectedIds: next,
    };
  });
}

export function setActive(imageId: string): void {
  editorState.update((state) => ({
    ...state,
    activeId: imageId,
  }));
}

export function undo(): void {
  const state = get(editorState);
  const result = history.undo(state.images);
  if (!result) {
    return;
  }
  const canUndo = Boolean(history.peekUndo());
  const canRedo = Boolean(history.peekRedo());
  editorState.update((current) => {
    const dirtyIds = new Set(current.dirtyIds);
    for (const id of result.changedIds) {
      dirtyIds.add(id);
    }
    return {
      ...current,
      images: result.images,
      dirtyIds,
      canUndo,
      canRedo,
    };
  });
}

export function redo(): void {
  const state = get(editorState);
  const result = history.redo(state.images);
  if (!result) {
    return;
  }
  const canUndo = Boolean(history.peekUndo());
  const canRedo = Boolean(history.peekRedo());
  editorState.update((current) => {
    const dirtyIds = new Set(current.dirtyIds);
    for (const id of result.changedIds) {
      dirtyIds.add(id);
    }
    return {
      ...current,
      images: result.images,
      dirtyIds,
      canUndo,
      canRedo,
    };
  });
}

export function addTagsToScope(tagsInput: string): void {
  const state = get(editorState);
  const tags = parseTagInput(tagsInput, state.tagSeparator);
  if (tags.length === 0) {
    return;
  }
  const scope = getScopePredicate(state);
  const change = addTagsToImages(state.images, tags, scope);
  applyTagChange("Add Tags", tags.length > 1, state.images, change);
}

export function addTagsToActive(tagsInput: string): void {
  const state = get(editorState);
  if (!state.activeId) {
    return;
  }
  const tags = parseTagInput(tagsInput, state.tagSeparator);
  if (tags.length === 0) {
    return;
  }
  const scope = scopeByIds(new Set([state.activeId]));
  const change = addTagsToImages(state.images, tags, scope);
  applyTagChange("Add Tags", false, state.images, change);
}

export function removeTagFromActive(tag: string): void {
  const state = get(editorState);
  if (!state.activeId) {
    return;
  }
  const scope = scopeByIds(new Set([state.activeId]));
  const change = deleteTagsInImages(state.images, [tag], scope);
  applyTagChange("Delete Tag", false, state.images, change);
}

export function applyCaptionToActive(caption: string): void {
  const state = get(editorState);
  if (!state.activeId) {
    return;
  }
  const tags = splitCaption(caption, state.tagSeparator, true);
  const change = setTagsForImage(state.images, state.activeId, tags);
  applyTagChange("Edit Tags", false, state.images, change);
}

export function replaceTagInActiveAtIndex(
  index: number,
  nextTag: string
): void {
  const state = get(editorState);
  if (!state.activeId) {
    return;
  }
  const image = state.images.find((item) => item.id === state.activeId);
  if (!image) {
    return;
  }
  if (index < 0 || index >= image.tags.length) {
    return;
  }
  const trimmed = nextTag.trim();
  if (!trimmed) {
    return;
  }
  if (image.tags[index] === trimmed) {
    return;
  }
  const tags = image.tags.slice();
  tags[index] = trimmed;
  const change = setTagsForImage(state.images, state.activeId, tags);
  applyTagChange("Rename Tag", false, state.images, change);
}

export function renameTagsInScope(
  oldTagsInput: string,
  newTag: string,
  useRegex: boolean,
  regexFlags: string
): void {
  setError(null);
  const state = get(editorState);
  if (!newTag.trim()) {
    return;
  }
  const scope = getScopePredicate(state);
  let change: TagChange | null = null;
  if (useRegex) {
    try {
      const pattern = new RegExp(oldTagsInput, regexFlags);
      change = renameTagsByRegexInImages(state.images, pattern, newTag, scope);
    } catch {
      setError("Invalid regex pattern.");
      return;
    }
  } else {
    const oldTags = parseTagInput(oldTagsInput, state.tagSeparator);
    if (oldTags.length === 0) {
      return;
    }
    change = renameTagsInImages(state.images, oldTags, newTag, scope);
  }
  applyTagChange("Rename Tags", true, state.images, change);
}

export function deleteTagsInScope(
  tagsInput: string,
  useRegex: boolean,
  regexFlags: string
): void {
  setError(null);
  const state = get(editorState);
  const scope = getScopePredicate(state);
  let change: TagChange | null = null;
  if (useRegex) {
    try {
      const pattern = new RegExp(tagsInput, regexFlags);
      change = deleteTagsByRegexInImages(state.images, pattern, scope);
    } catch {
      setError("Invalid regex pattern.");
      return;
    }
  } else {
    const tags = parseTagInput(tagsInput, state.tagSeparator);
    if (tags.length === 0) {
      return;
    }
    change = deleteTagsInImages(state.images, tags, scope);
  }
  applyTagChange("Delete Tags", true, state.images, change);
}

export function moveTagsToFrontInScope(tagsInput: string): void {
  const state = get(editorState);
  const tags = parseTagInput(tagsInput, state.tagSeparator);
  if (tags.length === 0) {
    return;
  }
  const scope = getScopePredicate(state);
  const change = moveTagsToFrontInImages(state.images, tags, scope);
  applyTagChange("Move Tags to Front", true, state.images, change);
}

export function sortTagsAlphabeticallyInScope(keepFirst: boolean): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = sortTagsAlphabeticallyInImages(
    state.images,
    keepFirst,
    scope
  );
  applyTagChange("Sort Tags", true, state.images, change);
}

export function sortTagsByFrequencyInScope(keepFirst: boolean): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const counts = countTags(state.images, scope);
  const change = sortTagsByFrequencyInImages(
    state.images,
    counts,
    keepFirst,
    scope
  );
  applyTagChange("Sort Tags", true, state.images, change);
}

export function reverseTagsInScope(keepFirst: boolean): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = reverseTagsInImages(state.images, keepFirst, scope);
  applyTagChange("Reverse Tags", true, state.images, change);
}

export function shuffleTagsInScope(keepFirst: boolean): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = shuffleTagsInImages(state.images, keepFirst, Math.random, scope);
  applyTagChange("Shuffle Tags", true, state.images, change);
}

export function removeDuplicateTagsInScope(): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = removeDuplicateTagsInImages(state.images, scope);
  applyTagChange("Remove Duplicate Tags", true, state.images, change);
}

export function removeEmptyTagsInScope(): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = removeEmptyTagsInImages(state.images, scope);
  applyTagChange("Remove Empty Tags", true, state.images, change);
}

export function findAndReplaceInScope(
  findText: string,
  replaceText: string,
  useRegex: boolean,
  regexFlags: string
): void {
  setError(null);
  const state = get(editorState);
  if (!findText) {
    return;
  }
  const scope = getScopePredicate(state);
  const change = findAndReplaceInImages(state.images, findText, replaceText, {
    tagSeparator: state.tagSeparator,
    scope,
    useRegex,
    regexFlags,
  });
  applyTagChange("Find and Replace", true, state.images, change);
}

export function getMatchCount(
  text: string,
  wholeTagsOnly: boolean,
  useRegex: boolean,
  regexFlags: string
): number {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  return getTextMatchCount(state.images, text, {
    tagSeparator: state.tagSeparator,
    scope,
    wholeTagsOnly,
    useRegex,
    regexFlags,
  });
}

export function removeAbstractPairsInScope(pairs: AbstractTagPair[]): void {
  const state = get(editorState);
  const scope = getScopePredicate(state);
  const change = removeAbstractTagsByPairsInImages(state.images, pairs, scope);
  applyTagChange("Remove Abstract Tags", true, state.images, change);
}

async function persistPresetPairs(
  nextPairs: AbstractTagPair[]
): Promise<boolean> {
  const state = get(editorState);
  if (!state.rootHandle) {
    setError("No root folder loaded.");
    return false;
  }
  try {
    await savePresetPairs(state.rootHandle, nextPairs);
    editorState.update((current) => ({
      ...current,
      presetPairs: nextPairs,
    }));
    return true;
  } catch {
    setError("Failed to save preset file.");
    return false;
  }
}

export async function addPresetPairs(
  pairs: AbstractTagPair[]
): Promise<boolean> {
  const state = get(editorState);
  const nextPairs = mergePresetPairs(state.presetPairs, pairs);
  if (nextPairs.length === state.presetPairs.length) {
    return true;
  }
  return persistPresetPairs(nextPairs);
}

export function applyPresetPairsInScope(): void {
  const state = get(editorState);
  if (state.presetPairs.length === 0) {
    return;
  }
  const scope = getScopePredicate(state);
  const change = removeAbstractTagsByPairsInImages(
    state.images,
    state.presetPairs,
    scope
  );
  applyTagChange("Remove Abstract Tags (Presets)", true, state.images, change);
}
