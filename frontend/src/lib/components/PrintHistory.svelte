<script lang="ts">
  import RefreshIcon from "$lib/components/icons/RefreshIcon.svelte"
  import Card from "$lib/components/Card.svelte"
  import { printerStore } from "$lib/stores/printer"
  import { activePrinterIdStore } from "$lib/stores/activePrinterId"
  import FileEntry from "./FileEntry.svelte"

  // Get the active printer from the store
  $: activePrinterId = $activePrinterIdStore
  $: printer = $printerStore[activePrinterId ?? ""]

  $: localFiles = printer?.files ?? []
  $: isPrinterIdle = printer?.state === "free"
</script>

<Card style="flex-grow: 1;">
  <div class="list-container-wrapper">
    <div class="list-container">
      {#if localFiles.length > 0}
        {#each localFiles as file}
          <FileEntry
            {file}
            onReprint={() =>
              activePrinterId &&
              printerStore.reprint(activePrinterId, file.name)}
            disabled={!isPrinterIdle}
          />
        {/each}
      {:else}
        <div class="empty-message">No files found</div>
      {/if}
    </div>
    <div class="fab-container">
      <button
        title="Refresh"
        class="refresh-button"
        on:click={() =>
          activePrinterId && printerStore.refreshFiles(activePrinterId)}
        disabled={!activePrinterId}><RefreshIcon /></button
      >
    </div>
  </div>
</Card>

<style>
  .list-container-wrapper {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .list-container {
    overflow-y: auto;
    flex-grow: 1;
  }

  .fab-container {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
  }

  button {
    padding: 0.75rem;
    border: none;
    border-radius: 50%;
    background-color: var(--accent-color);
    color: white;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s;
  }

  .refresh-button {
    gap: 0.5rem;
  }

  .empty-message {
    text-align: center;
    padding: 1rem;
  }
</style>
