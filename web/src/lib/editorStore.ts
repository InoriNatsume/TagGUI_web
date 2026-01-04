import { writable } from "svelte/store";
import type { ImageRecord } from "@core/models/ImageRecord";
import type { AbstractTagPair } from "@core/core/tagRelations";

export type ScopeMode = "all" | "filtered" | "selected";
export type TagSortMode = "frequency" | "alphabetical";
export type SortOrder = "asc" | "desc";
export type TagClickAction = "filter" | "add";

export interface EditorState {
  images: ImageRecord[];
  activeId: string | null;
  selectedIds: Set<string>;
  tagSeparator: string;
  filterText: string;
  tagFilter: string | null;
  allTagsSearch: string;
  allTagsSortMode: TagSortMode;
  allTagsOrder: SortOrder;
  tagClickAction: TagClickAction;
  scopeMode: ScopeMode;
  dirtyIds: Set<string>;
  presetPairs: AbstractTagPair[];
  rootHandle: FileSystemDirectoryHandle | null;
  canUndo: boolean;
  canRedo: boolean;
  errorMessage: string | null;
}

export const editorState = writable<EditorState>({
  images: [],
  activeId: null,
  selectedIds: new Set<string>(),
  tagSeparator: ", ",
  filterText: "",
  tagFilter: null,
  allTagsSearch: "",
  allTagsSortMode: "frequency",
  allTagsOrder: "desc",
  tagClickAction: "filter",
  scopeMode: "all",
  dirtyIds: new Set<string>(),
  presetPairs: [],
  rootHandle: null,
  canUndo: false,
  canRedo: false,
  errorMessage: null,
});
