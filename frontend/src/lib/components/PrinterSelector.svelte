<script lang="ts">
  import { printerStore } from "$lib/stores/printer"
  import { activePrinterIdStore } from "$lib/stores/activePrinterId"
  import { kobraConnectionStore } from "$lib/stores/kobraConnection"
  import { webserverStore } from "$lib/stores/webserver"

  $: printers = Object.values($printerStore)
  $: activePrinterId = $activePrinterIdStore
  $: activePrinter = $printerStore[activePrinterId ?? ""]

  let showSelector = false

  function handleOrbClick() {
    if (printers.length > 1) {
      showSelector = !showSelector
    }
  }

  function handleSelectPrinter(id: string) {
    activePrinterIdStore.select(id)
    showSelector = false
  }

  $: tooltip = (() => {
    const status = $kobraConnectionStore
    const config = $webserverStore
    const printerName = activePrinter?.name

    if (status === "connected" && printerName && config?.mqtt_webui_url) {
      return `${printerName} printer connected via ${config.mqtt_webui_url}`
    }
    return printerName ?? "Offline"
  })()
</script>

<div class="printer-selector">
  <button
    class="status-orb"
    class:online={activePrinter?.online}
    title={tooltip}
    on:click={handleOrbClick}
    disabled={!activePrinter}
    aria-label={tooltip}
  ></button>

  {#if showSelector}
    <div class="selector-dropdown">
      {#each printers as printer}
        <button
          class="selector-item"
          class:active={printer.id === activePrinterId}
          on:click={() => handleSelectPrinter(printer.id)}
        >
          {printer.name}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .printer-selector {
    position: relative;
  }

  .status-orb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #888; /* Gray for offline */
    border: none;
    cursor: pointer;
  }

  .status-orb.online {
    background-color: #28a745; /* Green for online */
  }

  .selector-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: var(--card-background-color);
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    padding: 0.5rem;
    z-index: 10;
    min-width: 150px;
  }

  .selector-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
  }

  .selector-item:hover {
    background-color: var(--card-border-color);
  }

  .selector-item.active {
    font-weight: bold;
  }
</style>
