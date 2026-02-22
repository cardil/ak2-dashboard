<script lang="ts">
  import ThermometerIcon from "$lib/components/icons/ThermometerIcon.svelte"
  import NozzleIcon from "$lib/components/icons/NozzleIcon.svelte"
  import StatusIcon from "$lib/components/icons/StatusIcon.svelte"
  import FilamentIcon from "$lib/components/icons/FilamentIcon.svelte"
  import ClockIcon from "$lib/components/icons/ClockIcon.svelte"
  import PauseIcon from "$lib/components/icons/PauseIcon.svelte"
  import StopIcon from "$lib/components/icons/StopIcon.svelte"
  import PlayIcon from "$lib/components/icons/PlayIcon.svelte"
  import Card from "$lib/components/Card.svelte"
  import EtaIcon from "$lib/components/icons/EtaIcon.svelte"
  import LayersIcon from "$lib/components/icons/LayersIcon.svelte"
  import FanIcon from "$lib/components/icons/FanIcon.svelte"
  import ZOffsetIcon from "$lib/components/icons/ZOffsetIcon.svelte"
  import SpeedIcon from "$lib/components/icons/SpeedIcon.svelte"
  import FilesIcon from "$lib/components/icons/FilesIcon.svelte"
  import { printerStore } from "$lib/stores/printer"
  import { activePrinterIdStore } from "$lib/stores/activePrinterId"
  import { formatDuration } from "$lib/utils/time"
  import { get } from "svelte/store"
  import { webserverStore } from "$lib/stores/webserver"
  import PrinterSelector from "./PrinterSelector.svelte"

  let input: HTMLInputElement

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      const file = target.files[0]
      const formData = new FormData()
      formData.append("file", file)
      if (activePrinterId) {
        formData.append("printer_id", activePrinterId)
      }

      const config = get(webserverStore)
      if (config?.mqtt_webui_url) {
        await fetch(`${config.mqtt_webui_url}/api/print`, {
          method: "POST",
          body: formData,
        })
      }
    }
  }

  // Get the active printer from the store
  $: activePrinterId = $activePrinterIdStore
  $: printer = $printerStore[activePrinterId ?? ""]

  $: isPrinterIdle = printer?.state === "free"
  $: canUploadAndPrint = !!(activePrinterId && isPrinterIdle && printer?.online)
  $: showExpandedView = !!printer && !isPrinterIdle && printer?.state !== "busy"
  $: nozzleTemp = printer?.nozzle_temp ?? "---"
  $: nozzleTarget = printer?.target_nozzle_temp ?? "---"
  $: bedTemp = printer?.hotbed_temp ?? "---"
  $: bedTarget = printer?.target_hotbed_temp ?? "---"
  $: status = printer?.state ?? "offline"
  $: progress = printer?.print_job?.progress ?? 0
  $: fileName = printer?.print_job?.filename ?? "No file"
  $: printTime = formatDuration((printer?.print_job?.print_time ?? 0) * 60)
  $: layers = (() => {
    const job = printer?.print_job
    const total_layers = job?.total_layers
    const curr_layer = job?.curr_layer

    // Use ?? -1 to handle case where job is null, so check becomes false
    const total_layers_known = (total_layers ?? -1) >= 0
    const curr_layer_known = (curr_layer ?? -1) >= 0

    if (curr_layer_known && total_layers_known) {
      return `${curr_layer} / ${total_layers}`
    }
    if (curr_layer_known && !total_layers_known) {
      return `${curr_layer}`
    }
    if (!curr_layer_known && total_layers_known) {
      return `? / ${total_layers}`
    }
    // This covers !curr_layer_known && !total_layers_known
    return "N/A"
  })()
  $: fanSpeed = (() => {
    const speed = printer?.print_job?.fan_speed
    return speed === undefined || speed < 0 ? "N/A" : `${speed}%`
  })()
  $: zOffset = printer?.print_job?.z_offset ?? 0
  $: filamentUsed = (() => {
    const usage = Number(printer?.print_job?.supplies_usage ?? 0)
    if (usage < 0) {
      return "N/A"
    }
    if (usage >= 1000) {
      return `${(usage / 1000).toFixed(2)} m`
    }
    return `${Math.round(usage)} mm`
  })()
  $: speedMode = (() => {
    const mode = printer?.print_job?.print_speed_mode
    if (mode === undefined || mode === null || mode < 0) return "N/A"
    return ["Silent", "Normal", "Sport"][mode] ?? "N/A"
  })()
  $: formattedZOffset = (() => {
    const offset = Number(printer?.print_job?.z_offset ?? 0)
    return `${offset > 0 ? "+" : ""}${offset.toFixed(2)} mm`
  })()

  // Calculated ETA
  $: eta = (() => {
    const job = printer?.print_job
    if (!job) return "N/A"

    // Use printer's ETA if available and not zero
    if (job.remaining_time > 0) {
      return formatDuration(job.remaining_time)
    }

    // Otherwise, calculate it if we have enough data
    if (job.progress > 0 && job.print_time > 0) {
      const totalEstimatedTime = (job.print_time * 60) / (job.progress / 100)
      const remainingTime = totalEstimatedTime - job.print_time * 60
      return formatDuration(remainingTime)
    }

    return "Calculating..."
  })()
</script>

<div style="flex-shrink: 0;">
  <Card>
    <input
      type="file"
      bind:this={input}
      on:change={handleFileSelect}
      style="display: none;"
      accept=".gcode"
    />
    <div class="status-row">
      <div class="status-item">
        <NozzleIcon />
        <div class="text">
          <span class="label">Nozzle</span>
          <span class="value">{nozzleTemp}° / {nozzleTarget}°</span>
        </div>
      </div>
      <div class="status-item">
        <ThermometerIcon />
        <div class="text">
          <span class="label">Bed</span>
          <span class="value">{bedTemp}° / {bedTarget}°</span>
        </div>
      </div>
      <div class="status-item">
        <StatusIcon />
        <div class="text">
          <div class="label-container">
            <span class="label">Status</span>
            <PrinterSelector />
          </div>
          <span class="value">{status}</span>
        </div>
      </div>
    </div>

    {#if showExpandedView}
      <div class="status-row">
        <div class="status-item">
          <FanIcon />
          <div class="text">
            <span class="label">Fan</span>
            <span class="value">{fanSpeed}</span>
          </div>
        </div>
        <div class="status-item">
          <ZOffsetIcon />
          <div class="text">
            <span class="label">Z-Offset</span>
            <span class="value">{formattedZOffset}</span>
          </div>
        </div>
        <div class="status-item">
          <SpeedIcon />
          <div class="text">
            <span class="label">Speed Mode</span>
            <span class="value">{speedMode}</span>
          </div>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {progress}%"></div>
        </div>
        <span class="progress-percent">{progress}%</span>
      </div>

      <div class="status-row file-info">
        <div class="status-item">
          <FilesIcon />
          <div class="text">
            <span class="label">File</span>
            <span class="value" title={fileName}>{fileName}</span>
          </div>
        </div>
      </div>

      <div class="status-row two-column-row">
        <div class="status-item">
          <ClockIcon />
          <div class="text">
            <span class="label">Elapsed Time</span>
            <span class="value">{printTime}</span>
          </div>
        </div>
        <div class="status-item">
          <EtaIcon />
          <div class="text">
            <span class="label">ETA</span>
            <span class="value">{eta}</span>
          </div>
        </div>
      </div>
      <div class="status-row two-column-row">
        <div class="status-item">
          <FilamentIcon />
          <div class="text">
            <span class="label">Filament Used</span>
            <span class="value">{filamentUsed}</span>
          </div>
        </div>
        <div class="status-item">
          <LayersIcon />
          <div class="text">
            <span class="label">Layer</span>
            <span class="value">{layers}</span>
          </div>
        </div>
      </div>

      <div class="button-group">
        {#if printer?.state === "printing" || printer?.state === "preheating" || printer?.state === "downloading"}
          <button
            on:click={() =>
              activePrinterId && printerStore.pausePrint(activePrinterId)}
            disabled={printer?.state === "preheating" ||
              printer?.state === "downloading"}
            title="Pause print"
          >
            <PauseIcon /> Pause
          </button>
        {:else if printer?.state === "paused"}
          <button
            on:click={() =>
              activePrinterId && printerStore.resumePrint(activePrinterId)}
            title="Resume print"
          >
            <PlayIcon /> Resume</button
          >
        {/if}
        <button
          on:click={() =>
            activePrinterId && printerStore.stopPrint(activePrinterId)}
          class="danger"
          title="Stop print"><StopIcon /> Stop</button
        >
      </div>
    {:else}
      <div class="button-group idle">
        <button
          disabled={!canUploadAndPrint}
          on:click={() => input.click()}
          title="Upload and print file">Upload & Print</button
        >
      </div>
    {/if}
  </Card>
</div>

<style>
  .status-row {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    padding-bottom: 0.5rem;
  }
  .status-row.two-column-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .status-row.two-column-row .status-item {
    padding-left: 1.5rem;
  }
  .status-item .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .label {
    font-size: 0.8em;
    opacity: 0.8;
  }

  .label-container {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .value {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .progress-bar-container {
    flex-grow: 1;
    height: 10px;
    background-color: var(--card-border-color);
    border-radius: 5px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background-color: var(--accent-color);
    border-radius: 5px;
  }

  .progress-percent {
    font-weight: bold;
  }

  .file-info .status-item {
    flex-grow: 1;
    min-width: 0;
    justify-content: center;
  }

  .file-info .value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .button-group {
    display: flex;
    gap: 1rem;
  }
  .button-group.idle {
    justify-content: center;
  }
  button {
    flex-grow: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 5px;
    background-color: var(--accent-color);
    color: white;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  button.danger {
    background-color: #dc3545;
  }
</style>
