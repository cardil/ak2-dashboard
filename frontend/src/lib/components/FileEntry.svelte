<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faDatabase, faRedo } from "@fortawesome/free-solid-svg-icons"
  import { faClock } from "@fortawesome/free-regular-svg-icons"
  import { formatTimestamp } from "$lib/utils/time"
  import { time } from "$lib/stores/time"
  import { formatFileSize } from "$lib/utils/files"

  export let file: { name: string; timestamp: number; size: number }
  export let onReprint: () => void
  export let disabled = false

  $: timeAgo = formatTimestamp(file.timestamp / 1000, $time / 1000)
  $: formattedSize = formatFileSize(file.size)
</script>

<div class="file-entry">
  <button class="icon-button" title="Re-print" on:click={onReprint} {disabled}>
    <FontAwesomeIcon icon={faRedo} />
  </button>
  <div class="file-details">
    <div class="filename" title={file.name}>{file.name}</div>
    <div class="file-meta">
      <div class="meta-item" title={`File size: ${formattedSize}`}>
        <FontAwesomeIcon icon={faDatabase} />
        <span>{formattedSize}</span>
      </div>
      <div class="meta-item" title={`Printed: ${timeAgo}`}>
        <FontAwesomeIcon icon={faClock} />
        <span>{timeAgo}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .file-entry {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    border-bottom: 1px solid var(--card-border-color);
  }

  .icon-button {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 5px;
    flex-shrink: 0;
  }
  .icon-button:hover {
    background-color: var(--card-border-color);
  }

  .file-details {
    flex-grow: 1;
    min-width: 0; /*  Allow shrinking */
  }

  .filename {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: bold;
  }

  .file-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.8em;
    opacity: 0.8;
    margin-top: 0.2rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
</style>
