<script lang="ts">
  import { onMount } from "svelte"
  import Webcam from "$lib/components/Webcam.svelte"
  import PrinterStats from "$lib/components/PrinterStats.svelte"
  import PrinterControls from "$lib/components/PrinterControls.svelte"
  import PrintHistory from "$lib/components/PrintHistory.svelte"
  import { webserverStore } from "$lib/stores/webserver"
  import { kobraConnectionStore } from "$lib/stores/kobraConnection"
  import ConnectionOverlay from "$lib/components/ConnectionOverlay.svelte"
  import { printerStore, type Printer } from "$lib/stores/printer"
  import { activePrinterIdStore } from "$lib/stores/activePrinterId"
  import { derived } from "svelte/store"

  let activePrinter: Printer | undefined
  const activePrinterStore = derived(
    [printerStore, activePrinterIdStore],
    ([$printerStore, $activePrinterIdStore]) => {
      return $activePrinterIdStore
        ? $printerStore[$activePrinterIdStore]
        : undefined
    },
  )

  let wasPrinting = false
  let wasOnline = false
  activePrinterStore.subscribe((printer) => {
    activePrinter = printer

    const isOnline = printer?.online ?? false
    if (isOnline && !wasOnline && printer) {
      printerStore.refreshFiles(printer.id)
    }
    wasOnline = isOnline

    const isPrinting =
      printer?.state === "printing" ||
      printer?.state === "paused" ||
      printer?.state === "preheating" ||
      printer?.state === "downloading"

    if (isPrinting && !wasPrinting && printer) {
      printerStore.refreshFiles(printer.id)
    }

    wasPrinting = isPrinting
  })

  let printerModel = ""
  let fwVersion = ""
  let unleashedLink = "#"
  let totalMemory = 0
  let freeMemory = 0
  let freeMemoryPercentage = 0
  let cpuTotalUsage = 0
  let cpuUserUsage = 0
  let cpuSystemUsage = 0
  let sshStatus = ""
  let uptime = ""

  webserverStore.subscribe((config) => {
    if (config) {
      printerModel = config.printer_model
      fwVersion = config.update_version
      unleashedLink = config.mqtt_webui_url
    }
  })

  onMount(() => {
    function fetchData() {
      fetch("/api/system")
        .then((response) => response.json())
        .then((data) => {
          totalMemory = Math.round(data.total_mem / 1024 / 1024)
          freeMemory = Math.round(data.free_mem / 1024 / 1024)
          freeMemoryPercentage = data.free_mem_per
          cpuTotalUsage = data.cpu_use
          cpuUserUsage = data.cpu_usr_use
          cpuSystemUsage = data.cpu_sys_use
          sshStatus =
            data.ssh_status == 2
              ? "Started"
              : data.ssh_status == 1
                ? "Stopped"
                : "N/A"
          uptime = data.uptime
        })
        .catch((error) => console.error("Error fetching info data:", error))
    }

    fetchData()
    const interval = setInterval(fetchData, 1000)

    return () => {
      clearInterval(interval)
    }
  })
</script>

<div class="page-container">
  <div class="main-content">
    <Webcam />
    <PrinterStats
      {totalMemory}
      {freeMemory}
      {freeMemoryPercentage}
      {cpuTotalUsage}
      {cpuUserUsage}
      {cpuSystemUsage}
      {printerModel}
      {fwVersion}
      {sshStatus}
      {uptime}
    />
  </div>
  <div class="sidebar">
    <div class="sidebar-content">
      <PrinterControls />
      <PrintHistory />
    </div>
    <ConnectionOverlay />
  </div>
</div>

<style>
  .page-container {
    display: grid;
    grid-template-columns: 3fr 1fr; /* Change to 75% / 25% split */
    grid-template-rows: 1fr; /* Make the rows fill the container height */
    padding: 1rem;
    gap: 1rem;
    height: 100%;
  }

  .main-content {
    display: grid;
    grid-template-rows: 1fr auto; /* Webcam gets remaining space, stats get auto height */
    gap: 1rem;
    overflow: hidden; /* Prevent the container from overflowing its parent */
    min-height: 0; /* CRITICAL: Allows this grid item to shrink */
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
    min-height: 0;
    position: relative;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
    flex-grow: 1;
  }

  @media (max-width: 768px) {
    .page-container {
      grid-template-columns: 1fr; /* Stack into a single column on mobile */
      height: auto; /* Allow content to scroll naturally on mobile */
    }
  }
</style>
