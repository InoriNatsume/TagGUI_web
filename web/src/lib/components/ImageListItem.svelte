<script lang="ts">
  import type { ImageRecord } from "@core/models/ImageRecord";
  import { buildCaptionPreview } from "../editorUtils";
  import { getImageUrl } from "../imagePreviewCache";

  export let image: ImageRecord;
  export let selected: boolean = false;
  export let active: boolean = false;
  export let dirty: boolean = false;
  export let tagSeparator: string = ", ";
  export let onClick: (event: MouseEvent) => void;
  export let delayMs: number = 0;

  $: caption = buildCaptionPreview(image.tags, tagSeparator);
</script>

<button
  class="image-item {selected ? 'selected' : ''} {active ? 'active' : ''}"
  on:click={onClick}
  type="button"
  style={`animation-delay: ${delayMs}ms`}
>
  <div class="thumb">
    {#await getImageUrl(image)}
      <div class="preview-placeholder">...</div>
    {:then url}
      <img src={url} alt={image.source.fileName} />
    {:catch}
      <div class="preview-placeholder">No Preview</div>
    {/await}
  </div>
  <div class="meta">
    <div class="name">{image.source.fileName}</div>
    <div class="caption">{caption}</div>
  </div>
  {#if dirty}
    <span class="dirty-dot"></span>
  {/if}
</button>
