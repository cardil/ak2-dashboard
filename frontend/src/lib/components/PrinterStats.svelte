<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import { formatDuration, parseUptime } from "$lib/utils/time"

  export let totalMemory: number
  export let freeMemory: number
  export let freeMemoryPercentage: number
  export let cpuTotalUsage: number
  export let cpuUserUsage: number
  export let cpuSystemUsage: number
  export let printerModel: string
  export let fwVersion: string
  export let sshStatus: string
  export let uptime: string

  $: memoryUsedPercentage = 100 - freeMemoryPercentage
  $: memoryTitle = `Free memory: ${freeMemoryPercentage}%; ${freeMemory} MB of ${totalMemory} MB`
  $: cpuValue = `${cpuTotalUsage}%`
  $: cpuTitle = `Used CPU: ${cpuTotalUsage}%; User: ${cpuUserUsage}%; System: ${cpuSystemUsage}%`

  $: uptimeInSeconds = parseUptime(uptime)
</script>

<Card>
  <div class="stats-grid">
    <div class="stat-item">
      <span class="label" title="Used memory">Memory Used</span>
      <span class="value" title={memoryTitle}
        >{memoryUsedPercentage}% <span class="divider">of</span>
        {totalMemory} MB</span
      >
    </div>
    <div class="stat-item">
      <span class="label" title="Used CPU">CPU Used</span>
      <span class="value" title={cpuTitle}>{cpuValue}</span>
    </div>
    <div class="stat-item">
      <span class="label">Uptime</span>
      <span class="value">{formatDuration(uptimeInSeconds)}</span>
    </div>
    <div class="stat-item">
      <span class="label">SSH</span>
      <span class="value">{sshStatus}</span>
    </div>
    <div class="stat-item">
      <span class="label">Model</span>
      <span class="value"
        >{printerModel} <span class="divider">ver.</span> {fwVersion}</span
      >
    </div>
  </div>
</Card>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
  }
  .label {
    font-size: 0.8em;
    opacity: 0.8;
  }
  .value {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
  }
  .divider {
    margin: 0 0.15rem;
    font-weight: normal;
    font-size: 0.8em;
    opacity: 0.75;
  }
</style>
