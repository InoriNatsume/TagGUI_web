import { derived } from "svelte/store";
import { editorState } from "./editorStore";
import { buildAllTagsList, filterImages } from "./editorUtils";
import { buildScopePredicate } from "./scopeUtils";
import { collectAbstractTagPairsInImages } from "@core/core/tagRelations";

export interface AbstractConflictItem {
  abstractTag: string;
  concreteTag: string;
  count: number;
  imageIds: string[];
  isPreset: boolean;
}

export interface AbstractConflictGroup {
  abstractTag: string;
  totalCount: number;
  items: AbstractConflictItem[];
}

export const filteredImages = derived(editorState, (state) =>
  filterImages(
    state.images,
    state.filterText,
    state.tagFilter,
    state.tagSeparator
  )
);

export const activeImage = derived(editorState, (state) => {
  if (!state.activeId) {
    return null;
  }
  return state.images.find((image) => image.id === state.activeId) ?? null;
});

export const allTags = derived(editorState, (state) =>
  buildAllTagsList(
    state.images,
    state.allTagsSearch,
    state.allTagsSortMode,
    state.allTagsOrder
  )
);

export const abstractConflictGroups = derived(editorState, (state) => {
  const scope = buildScopePredicate(state);
  const pairs = collectAbstractTagPairsInImages(state.images, scope);
  const presetKeys = new Set(
    state.presetPairs.map(
      (pair) => `${pair.abstractTag}\u0000${pair.concreteTag}`
    )
  );
  const groupMap = new Map<string, AbstractConflictGroup>();
  for (const pair of pairs) {
    const key = pair.abstractTag;
    const item: AbstractConflictItem = {
      abstractTag: pair.abstractTag,
      concreteTag: pair.concreteTag,
      count: pair.count,
      imageIds: pair.imageIds,
      isPreset: presetKeys.has(
        `${pair.abstractTag}\u0000${pair.concreteTag}`
      ),
    };
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        abstractTag: pair.abstractTag,
        totalCount: 0,
        items: [],
      });
    }
    const group = groupMap.get(key) as AbstractConflictGroup;
    group.items.push(item);
    group.totalCount += pair.count;
  }
  const groups = Array.from(groupMap.values());
  for (const group of groups) {
    group.items.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.concreteTag.localeCompare(b.concreteTag);
    });
  }
  groups.sort((a, b) => {
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    return a.abstractTag.localeCompare(b.abstractTag);
  });
  return groups;
});
