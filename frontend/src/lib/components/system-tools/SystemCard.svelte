<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import InfoWidget from "$lib/components/InfoWidget.svelte"
  import { systemInfo } from "$lib/stores/system"
  import { faPowerOff, faSync } from "@fortawesome/free-solid-svg-icons"
  import Fa from "svelte-fa"
  import { formatDuration, parseUptime } from "$lib/utils/time"
  import "./system-tools.css"

  export let onShowConfirmationModal: (action: "reboot" | "poweroff") => void

  $: uptimeInSeconds = parseUptime($systemInfo?.uptime ?? "")
  $: memoryTitle = $systemInfo
    ? `Free memory: ${Math.round($systemInfo.free_mem / (1024 * 1024))} MB of ${Math.round($systemInfo.total_mem / (1024 * 1024))} MB`
    : ""
  $: cpuTitle = $systemInfo
    ? `Used CPU: ${$systemInfo.cpu_use}%; User: ${$systemInfo.cpu_usr_use}%; System: ${$systemInfo.cpu_sys_use}%`
    : ""
</script>

<Card>
  <svelte:fragment slot="title">
    <h3 class="card-title"><Fa icon={faPowerOff} /> System</h3>
  </svelte:fragment>
  <div class="tool-section horizontal">
    {#if $systemInfo}
      <div class="info-widgets">
        <InfoWidget label="Uptime" title={$systemInfo.uptime}>
          {formatDuration(uptimeInSeconds)}
        </InfoWidget>
        <InfoWidget label="CPU" title={cpuTitle}
          >{$systemInfo.cpu_use}%</InfoWidget
        >
        <InfoWidget label="Memory" title={memoryTitle}>
          {Math.round(
            ($systemInfo.total_mem - $systemInfo.free_mem) / (1024 * 1024),
          )} / {Math.round($systemInfo.total_mem / (1024 * 1024))} MB
        </InfoWidget>
      </div>
      <div class="button-group">
        <button
          class="reboot"
          on:click={() => onShowConfirmationModal("reboot")}
          title="Reboot printer"><Fa icon={faSync} /> Reboot</button
        >
        <button
          class="danger"
          on:click={() => onShowConfirmationModal("poweroff")}
          title="Shutdown printer"><Fa icon={faPowerOff} /> Shutdown</button
        >
      </div>
    {:else}
      <p>Loading...</p>
    {/if}
  </div>
</Card>

<style>
  /* Styles imported from system-tools.css */
</style>
