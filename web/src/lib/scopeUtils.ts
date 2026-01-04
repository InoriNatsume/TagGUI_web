import { includeAll, scopeByIds, type ScopePredicate } from "@core/core/scope";
import type { EditorState } from "./editorStore";
import { filterImages } from "./editorUtils";

export function buildScopePredicate(state: EditorState): ScopePredicate {
  if (state.scopeMode === "all") {
    return includeAll;
  }
  if (state.scopeMode === "selected") {
    return scopeByIds(state.selectedIds);
  }
  const filtered = filterImages(
    state.images,
    state.filterText,
    state.tagFilter,
    state.tagSeparator
  );
  const ids = new Set(filtered.map((image) => image.id));
  return scopeByIds(ids);
}
