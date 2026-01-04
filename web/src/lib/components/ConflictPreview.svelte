<script lang="ts">
  import type { ImageRecord } from "@core/models/ImageRecord";
  import { getImageUrl } from "../imagePreviewCache";

  export let images: ImageRecord[] = [];
  export let maxItems: number = 12;

  $: visibleImages = images.slice(0, maxItems);
</script>

<div class="preview-grid">
  {#each visibleImages as image (image.id)}
    <div class="preview-thumb">
      {#await getImageUrl(image)}
        <div class="preview-placeholder">...</div>
      {:then url}
        <img src={url} alt={image.source.fileName} />
      {:catch}
        <div class="preview-placeholder">No Preview</div>
      {/await}
    </div>
  {/each}
</div>
