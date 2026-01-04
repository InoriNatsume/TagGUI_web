<script lang="ts">
  import { editorState } from "./lib/editorStore";
  import {
    activeImage,
    allTags,
    filteredImages,
    abstractConflictGroups,
    type AbstractConflictItem,
  } from "./lib/editorSelectors";
  import {
    addTagsToActive,
    addTagsToScope,
    applyCaptionToActive,
    deleteTagsInScope,
    findAndReplaceInScope,
    getMatchCount,
    moveTagsToFrontInScope,
    openDirectory,
    redo,
    removeDuplicateTagsInScope,
    removeEmptyTagsInScope,
    renameTagsInScope,
    reverseTagsInScope,
    saveDirty,
    selectOnly,
    shuffleTagsInScope,
    sortTagsAlphabeticallyInScope,
    sortTagsByFrequencyInScope,
    toggleSelection,
    undo,
    updateState,
    removeTagFromActive,
    removeAbstractPairsInScope,
    applyPresetPairsInScope,
    addPresetPairs,
    replaceTagInActiveAtIndex,
  } from "./lib/editorActions";
  import ImageListItem from "./lib/components/ImageListItem.svelte";
  import ImagePreview from "./lib/components/ImagePreview.svelte";
  import ConflictPreview from "./lib/components/ConflictPreview.svelte";

  let addBatchInput = "";
  let addActiveInput = "";
  let renameOldInput = "";
  let renameNewInput = "";
  let renameUseRegex = false;
  let renameFlags = "";
  let deleteInput = "";
  let deleteUseRegex = false;
  let deleteFlags = "";
  let moveFrontInput = "";
  let keepFirstTag = true;
  let findText = "";
  let replaceText = "";
  let findUseRegex = false;
  let findFlags = "";
  let matchWholeTagsOnly = false;
  let matchCount: number | null = null;
  let activeCaptionDraft = "";
  let lastActiveId: string | null = null;
  let selectedConflict: AbstractConflictItem | null = null;
  let activeTab: "all" | "image" | "abstract" = "all";
  let editingAllTag: string | null = null;
  let editingAllTagValue = "";
  let editingImageTagIndex: number | null = null;
  let editingImageTagValue = "";

  $: totalCount = $editorState.images.length;
  $: filteredCount = $filteredImages.length;
  $: selectedCount = $editorState.selectedIds.size;
  $: dirtyCount = $editorState.dirtyIds.size;
  $: tagCount = $allTags.length;
  $: conflictGroupCount = $abstractConflictGroups.length;
  $: conflictPairCount = $abstractConflictGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  $: if ($activeImage?.id !== lastActiveId) {
    activeCaptionDraft = $activeImage
      ? $activeImage.tags.join($editorState.tagSeparator)
      : "";
    lastActiveId = $activeImage?.id ?? null;
    editingImageTagIndex = null;
  }

  function handleImageClick(event: MouseEvent, imageId: string): void {
    if (event.ctrlKey || event.metaKey) {
      toggleSelection(imageId);
    } else {
      selectOnly(imageId);
    }
  }

  function handleFilterInput(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value;
    updateState({ filterText: value });
  }

  function handleAllTagsSearch(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value;
    updateState({ allTagsSearch: value });
  }

  function handleAllTagsSortMode(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as
      | "frequency"
      | "alphabetical";
    updateState({ allTagsSortMode: value });
  }

  function handleAllTagsOrder(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as
      | "asc"
      | "desc";
    updateState({ allTagsOrder: value });
  }

  function handleTagClickAction(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as
      | "filter"
      | "add";
    updateState({ tagClickAction: value });
  }

  function handleScopeMode(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as
      | "all"
      | "filtered"
      | "selected";
    updateState({ scopeMode: value });
  }

  function handleTagClick(tag: string): void {
    if ($editorState.tagClickAction === "filter") {
      updateState({ tagFilter: tag });
    } else {
      addTagsToScope(tag);
    }
  }

  function startAllTagEdit(event: MouseEvent, tag: string): void {
    event.preventDefault();
    editingAllTag = tag;
    editingAllTagValue = tag;
  }

  function commitAllTagEdit(): void {
    if (!editingAllTag) {
      return;
    }
    const trimmed = editingAllTagValue.trim();
    if (trimmed && trimmed !== editingAllTag) {
      renameTagsInScope(editingAllTag, trimmed, false, "");
    }
    editingAllTag = null;
  }

  function cancelAllTagEdit(): void {
    editingAllTag = null;
  }

  function handleAllTagKey(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      commitAllTagEdit();
    } else if (event.key === "Escape") {
      cancelAllTagEdit();
    }
  }

  function startImageTagEdit(tag: string, index: number): void {
    editingImageTagIndex = index;
    editingImageTagValue = tag;
  }

  function commitImageTagEdit(): void {
    if (editingImageTagIndex === null) {
      return;
    }
    const trimmed = editingImageTagValue.trim();
    if (trimmed) {
      replaceTagInActiveAtIndex(editingImageTagIndex, trimmed);
    }
    editingImageTagIndex = null;
  }

  function cancelImageTagEdit(): void {
    editingImageTagIndex = null;
  }

  function handleImageTagKey(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      commitImageTagEdit();
    } else if (event.key === "Escape") {
      cancelImageTagEdit();
    }
  }

  function selectConflict(item: AbstractConflictItem): void {
    if (item.isPreset) {
      removeAbstractPairsInScope([
        { abstractTag: item.abstractTag, concreteTag: item.concreteTag },
      ]);
      selectedConflict = null;
      return;
    }
    selectedConflict = item;
  }

  async function approveAndRemoveSelected(): Promise<void> {
    if (!selectedConflict) {
      return;
    }
    const message = `Remove "${selectedConflict.abstractTag}" when "${selectedConflict.concreteTag}" exists?`;
    if (!window.confirm(message)) {
      return;
    }
    await addPresetPairs([
      {
        abstractTag: selectedConflict.abstractTag,
        concreteTag: selectedConflict.concreteTag,
      },
    ]);
    removeAbstractPairsInScope([
      {
        abstractTag: selectedConflict.abstractTag,
        concreteTag: selectedConflict.concreteTag,
      },
    ]);
    selectedConflict = null;
  }

  function clearSelectedConflict(): void {
    selectedConflict = null;
  }

  $: selectedConflictImages = selectedConflict
    ? $editorState.images.filter((image) =>
        selectedConflict?.imageIds.includes(image.id)
      )
    : [];

  $: if (selectedConflict) {
    const exists = $abstractConflictGroups.some((group) =>
      group.items.some(
        (item) =>
          item.abstractTag === selectedConflict?.abstractTag &&
          item.concreteTag === selectedConflict?.concreteTag
      )
    );
    if (!exists) {
      selectedConflict = null;
    }
  }

  function removeAllConflicts(): void {
    const pairs = $abstractConflictGroups.flatMap((group) =>
      group.items.map((item) => ({
        abstractTag: item.abstractTag,
        concreteTag: item.concreteTag,
      }))
    );
    if (pairs.length === 0) {
      return;
    }
    removeAbstractPairsInScope(pairs);
    selectedConflict = null;
  }

  async function saveAndRemoveAllConflicts(): Promise<void> {
    const pairs = $abstractConflictGroups.flatMap((group) =>
      group.items.map((item) => ({
        abstractTag: item.abstractTag,
        concreteTag: item.concreteTag,
      }))
    );
    if (pairs.length === 0) {
      return;
    }
    await addPresetPairs(pairs);
    removeAbstractPairsInScope(pairs);
    selectedConflict = null;
  }

  function resetActiveCaption(): void {
    if ($activeImage) {
      activeCaptionDraft = $activeImage.tags.join($editorState.tagSeparator);
    }
  }

  function runAddBatch(): void {
    addTagsToScope(addBatchInput);
    addBatchInput = "";
  }

  function runAddActive(): void {
    addTagsToActive(addActiveInput);
    addActiveInput = "";
  }

  function runRename(): void {
    renameTagsInScope(renameOldInput, renameNewInput, renameUseRegex, renameFlags);
  }

  function runDelete(): void {
    deleteTagsInScope(deleteInput, deleteUseRegex, deleteFlags);
  }

  function runMoveFront(): void {
    moveTagsToFrontInScope(moveFrontInput);
  }

  function runFindReplace(): void {
    findAndReplaceInScope(findText, replaceText, findUseRegex, findFlags);
  }

  function updateMatchCounter(): void {
    matchCount = getMatchCount(
      findText,
      matchWholeTagsOnly,
      findUseRegex,
      findFlags
    );
  }
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">Tag Editor</div>
    <div class="toolbar">
      <button class="button" type="button" on:click={openDirectory}>
        Open Folder
      </button>
      <button
        class="button secondary"
        type="button"
        on:click={saveDirty}
        disabled={dirtyCount === 0}
      >
        Save
      </button>
      <button
        class="button secondary"
        type="button"
        on:click={undo}
        disabled={!$editorState.canUndo}
      >
        Undo
      </button>
      <button
        class="button secondary"
        type="button"
        on:click={redo}
        disabled={!$editorState.canRedo}
      >
        Redo
      </button>
    </div>
    <div class="status">
      <span>Images {filteredCount}/{totalCount}</span>
      <span>Selected {selectedCount}</span>
      <span>Dirty {dirtyCount}</span>
      <span>Tags {tagCount}</span>
    </div>
  </header>

  {#if $editorState.errorMessage}
    <div class="error">{$editorState.errorMessage}</div>
  {/if}

  <div class="board">
    <section class="panel list">
      <div class="panel-title">Images</div>
      <input
        class="input"
        type="text"
        placeholder="Filter images"
        value={$editorState.filterText}
        on:input={handleFilterInput}
      />
      <div class="image-list">
        {#if $filteredImages.length === 0}
          <div class="preview-placeholder">No images loaded.</div>
        {/if}
        {#each $filteredImages as image, index (image.id)}
          <ImageListItem
            image={image}
            selected={$editorState.selectedIds.has(image.id)}
            active={$editorState.activeId === image.id}
            dirty={$editorState.dirtyIds.has(image.id)}
            tagSeparator={$editorState.tagSeparator}
            delayMs={index * 20}
            onClick={(event) => handleImageClick(event, image.id)}
          />
        {/each}
      </div>
    </section>

    <section class="panel viewer">
      <div class="panel-title">Preview</div>
      <ImagePreview image={$activeImage} />
      <div class="panel-title">Caption</div>
      <textarea
        class="textarea"
        rows="3"
        bind:value={activeCaptionDraft}
        disabled={!$activeImage}
      ></textarea>
      <div class="form-row">
        <button
          class="button"
          type="button"
          on:click={() => applyCaptionToActive(activeCaptionDraft)}
          disabled={!$activeImage}
        >
          Apply Caption
        </button>
        <button
          class="button secondary"
          type="button"
          on:click={resetActiveCaption}
          disabled={!$activeImage}
        >
          Reset
        </button>
      </div>
    </section>

    <section class="panel tabs-panel">
      <div class="tab-buttons">
        <button
          class="tab-button"
          class:active={activeTab === "all"}
          type="button"
          on:click={() => (activeTab = "all")}
        >
          All Tags
        </button>
        <button
          class="tab-button"
          class:active={activeTab === "image"}
          type="button"
          on:click={() => (activeTab = "image")}
        >
          Image Tags
        </button>
        <button
          class="tab-button"
          class:active={activeTab === "abstract"}
          type="button"
          on:click={() => (activeTab = "abstract")}
        >
          Abstract Tags
        </button>
      </div>

      {#if activeTab === "all"}
        <div class="tab-pane">
          <div class="panel-title">All Tags</div>
          <div class="form-grid">
            <div class="form-row">
              <strong>Scope</strong>
              <select
                class="select"
                value={$editorState.scopeMode}
                on:change={handleScopeMode}
              >
                <option value="all">All images</option>
                <option value="filtered">Filtered images</option>
                <option value="selected">Selected images</option>
              </select>
            </div>
            <input
              class="input"
              type="text"
              placeholder="Search tags"
              value={$editorState.allTagsSearch}
              on:input={handleAllTagsSearch}
            />
            <div class="form-row">
              <select
                class="select"
                value={$editorState.allTagsSortMode}
                on:change={handleAllTagsSortMode}
              >
                <option value="frequency">Frequency</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <select
                class="select"
                value={$editorState.allTagsOrder}
                on:change={handleAllTagsOrder}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div class="form-row">
              <select
                class="select"
                value={$editorState.tagClickAction}
                on:change={handleTagClickAction}
              >
                <option value="filter">Tag click: filter</option>
                <option value="add">Tag click: add to scope</option>
              </select>
              <button
                class="button secondary"
                type="button"
                on:click={() => updateState({ tagFilter: null })}
                disabled={!$editorState.tagFilter}
              >
                Clear tag filter
              </button>
            </div>
            <div class="form-row">
              <input
                class="input"
                type="text"
                placeholder="Add tags to scope"
                bind:value={addBatchInput}
              />
              <button class="button" type="button" on:click={runAddBatch}>
                Add
              </button>
            </div>
          </div>
          <div class="hint">Right-click or double-click a tag to rename.</div>
          <div class="tag-list">
            {#each $allTags as tag}
              <div class="tag-row">
                {#if editingAllTag === tag.tag}
                  <input
                    class="input inline-input"
                    type="text"
                    bind:value={editingAllTagValue}
                    on:keydown={handleAllTagKey}
                    on:blur={commitAllTagEdit}
                  />
                  <span class="count">{tag.count}</span>
                {:else}
                  <button
                    type="button"
                    on:click={() => handleTagClick(tag.tag)}
                    on:dblclick={(event) => startAllTagEdit(event, tag.tag)}
                    on:contextmenu={(event) => startAllTagEdit(event, tag.tag)}
                  >
                    {tag.tag}
                  </button>
                  <span class="count">{tag.count}</span>
                {/if}
              </div>
            {/each}
          </div>

          <div class="form-grid">
            <strong>Quick Actions</strong>
            <div class="form-row">
              <label>
                <input type="checkbox" bind:checked={keepFirstTag} />
                Keep first tag
              </label>
            </div>
            <div class="form-row">
              <button
                class="button secondary"
                type="button"
                on:click={() => sortTagsAlphabeticallyInScope(keepFirstTag)}
              >
                Sort A-Z
              </button>
              <button
                class="button secondary"
                type="button"
                on:click={() => sortTagsByFrequencyInScope(keepFirstTag)}
              >
                Sort by frequency
              </button>
            </div>
            <div class="form-row">
              <button
                class="button secondary"
                type="button"
                on:click={() => reverseTagsInScope(keepFirstTag)}
              >
                Reverse order
              </button>
              <button
                class="button secondary"
                type="button"
                on:click={() => shuffleTagsInScope(keepFirstTag)}
              >
                Shuffle
              </button>
            </div>
            <div class="form-row">
              <button
                class="button secondary"
                type="button"
                on:click={removeDuplicateTagsInScope}
              >
                Remove duplicates
              </button>
              <button
                class="button secondary"
                type="button"
                on:click={removeEmptyTagsInScope}
              >
                Remove empty tags
              </button>
            </div>
            <div class="form-row">
              <input
                class="input"
                type="text"
                placeholder="Move tags to front"
                bind:value={moveFrontInput}
              />
              <button class="button" type="button" on:click={runMoveFront}>
                Move
              </button>
            </div>
          </div>

          <details class="details">
            <summary>Advanced</summary>
            <div class="details-body">
              <div class="form-grid">
                <strong>Find and Replace</strong>
                <input
                  class="input"
                  type="text"
                  placeholder="Find text"
                  bind:value={findText}
                  on:input={() => (matchCount = null)}
                />
                <input
                  class="input"
                  type="text"
                  placeholder="Replace with"
                  bind:value={replaceText}
                />
                <div class="form-row">
                  <label>
                    <input type="checkbox" bind:checked={findUseRegex} />
                    Use regex
                  </label>
                  <input
                    class="input"
                    type="text"
                    placeholder="Flags"
                    bind:value={findFlags}
                  />
                  <label>
                    <input type="checkbox" bind:checked={matchWholeTagsOnly} />
                    Whole tags only
                  </label>
                </div>
                <div class="form-row">
                  <button class="button" type="button" on:click={runFindReplace}>
                    Replace
                  </button>
                  <button
                    class="button secondary"
                    type="button"
                    on:click={updateMatchCounter}
                  >
                    Count matches
                  </button>
                  {#if matchCount !== null}
                    <span class="count">{matchCount} matches</span>
                  {/if}
                </div>
              </div>

              <div class="form-grid">
                <strong>Rename Tags</strong>
                <input
                  class="input"
                  type="text"
                  placeholder="Old tags or regex"
                  bind:value={renameOldInput}
                />
                <input
                  class="input"
                  type="text"
                  placeholder="New tag"
                  bind:value={renameNewInput}
                />
                <div class="form-row">
                  <label>
                    <input type="checkbox" bind:checked={renameUseRegex} />
                    Use regex
                  </label>
                  <input
                    class="input"
                    type="text"
                    placeholder="Flags"
                    bind:value={renameFlags}
                  />
                  <button class="button" type="button" on:click={runRename}>
                    Rename
                  </button>
                </div>
              </div>

              <div class="form-grid">
                <strong>Delete Tags</strong>
                <input
                  class="input"
                  type="text"
                  placeholder="Tags or regex"
                  bind:value={deleteInput}
                />
                <div class="form-row">
                  <label>
                    <input type="checkbox" bind:checked={deleteUseRegex} />
                    Use regex
                  </label>
                  <input
                    class="input"
                    type="text"
                    placeholder="Flags"
                    bind:value={deleteFlags}
                  />
                  <button class="button warn" type="button" on:click={runDelete}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>
      {:else if activeTab === "image"}
        <div class="tab-pane">
          <div class="panel-title">Image Tags</div>
          {#if $activeImage}
            <div class="form-row">
              <input
                class="chip-input"
                type="text"
                placeholder="Add tag"
                bind:value={addActiveInput}
              />
              <button class="button" type="button" on:click={runAddActive}>
                Add
              </button>
            </div>
            <div class="tag-list">
              {#if $activeImage.tags.length === 0}
                <div class="preview-placeholder">No tags for this image.</div>
              {/if}
              {#each $activeImage.tags as tagValue, tagIndex (tagIndex)}
                <div class="tag-chip">
                  {#if editingImageTagIndex === tagIndex}
                    <input
                      class="chip-input"
                      type="text"
                      bind:value={editingImageTagValue}
                      on:keydown={handleImageTagKey}
                      on:blur={commitImageTagEdit}
                    />
                    <button
                      class="chip-remove"
                      type="button"
                      on:click={cancelImageTagEdit}
                    >
                      x
                    </button>
                  {:else}
                    <button
                      class="tag-inline"
                      type="button"
                      on:click={() => startImageTagEdit(tagValue, tagIndex)}
                    >
                      {tagValue}
                    </button>
                    <button
                      class="chip-remove"
                      type="button"
                      on:click={() => removeTagFromActive(tagValue)}
                    >
                      x
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="preview-placeholder">Select an image to edit tags.</div>
          {/if}
        </div>
      {:else}
        <div class="tab-pane">
          <div class="panel-title">Abstract Tag Cleanup</div>
          <div class="form-row">
            <button
              class="button secondary"
              type="button"
              on:click={applyPresetPairsInScope}
              disabled={$editorState.presetPairs.length === 0}
            >
              Apply presets
            </button>
            <button
              class="button secondary"
              type="button"
              on:click={removeAllConflicts}
              disabled={conflictPairCount === 0}
            >
              Remove all (no preset)
            </button>
            <button
              class="button"
              type="button"
              on:click={saveAndRemoveAllConflicts}
              disabled={conflictPairCount === 0}
            >
              Remove all + Save preset
            </button>
            <span class="count">
              {conflictGroupCount} groups / {conflictPairCount} pairs
            </span>
          </div>
          <div class="tag-list">
            {#if conflictPairCount === 0}
              <div class="preview-placeholder">No abstract tag pairs found.</div>
            {:else}
              {#each $abstractConflictGroups as group}
                <div class="panel-title" style="margin-top: 6px;">
                  {group.abstractTag}
                </div>
                {#each group.items as item}
                  <div class="tag-row">
                    <button type="button" on:click={() => selectConflict(item)}>
                      {item.concreteTag}
                      {#if item.isPreset}
                        <span class="count">preset</span>
                      {/if}
                    </button>
                    <span class="count">{item.count}</span>
                  </div>
                {/each}
              {/each}
            {/if}
          </div>
          {#if selectedConflict}
            <div class="panel-title">Preview</div>
            <div class="form-row">
              <span class="count">
                {selectedConflict.abstractTag} -> {selectedConflict.concreteTag}
              </span>
              <button
                class="button"
                type="button"
                on:click={approveAndRemoveSelected}
              >
                Remove + Save preset
              </button>
              <button
                class="button secondary"
                type="button"
                on:click={clearSelectedConflict}
              >
                Cancel
              </button>
            </div>
            <ConflictPreview images={selectedConflictImages} />
          {/if}
        </div>
      {/if}
    </section>
  </div>
</div>
