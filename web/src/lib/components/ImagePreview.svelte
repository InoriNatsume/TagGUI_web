<script lang="ts">
  import type { ImageRecord } from "@core/models/ImageRecord";
  import { getImageUrl } from "../imagePreviewCache";

  export let image: ImageRecord | null = null;
</script>

<div class="preview">
  {#if image}
    {#await getImageUrl(image)}
      <div class="preview-placeholder">Loading preview...</div>
    {:then url}
      <img src={url} alt={image.source.fileName} />
    {:catch}
      <div class="preview-placeholder">Preview failed.</div>
    {/await}
  {:else}
    <div class="preview-placeholder">Select an image to preview.</div>
  {/if}
</div>
