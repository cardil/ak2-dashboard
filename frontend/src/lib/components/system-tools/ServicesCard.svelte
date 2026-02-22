<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import InfoWidget from "$lib/components/InfoWidget.svelte"
  import { systemInfo } from "$lib/stores/system"
  import {
    faBell,
    faSync,
    faPlay,
    faStop,
  } from "@fortawesome/free-solid-svg-icons"
  import Fa from "svelte-fa"
  import "./system-tools.css"

  export let onHandleSystemAction: (
    action: "ssh_start" | "ssh_stop" | "ssh_restart",
  ) => void
</script>

<Card>
  <svelte:fragment slot="title">
    <h3 class="card-title"><Fa icon={faBell} /> Services</h3>
  </svelte:fragment>
  <div class="tool-section horizontal">
    {#if $systemInfo}
      <div class="info-widgets">
        <InfoWidget label="SSH">
          {$systemInfo.ssh_status === 2 ? "Running" : "Stopped"}
        </InfoWidget>
      </div>
      <div class="button-group">
        <button
          class:success={$systemInfo.ssh_status !== 2}
          class:danger={$systemInfo.ssh_status === 2}
          on:click={() =>
            onHandleSystemAction(
              $systemInfo.ssh_status === 2 ? "ssh_stop" : "ssh_start",
            )}
          title={$systemInfo.ssh_status === 2
            ? "Stop SSH service"
            : "Start SSH service"}
        >
          <Fa icon={$systemInfo.ssh_status === 2 ? faStop : faPlay} />
          {$systemInfo.ssh_status === 2 ? "Stop" : "Start"}
        </button>
        {#if $systemInfo.ssh_status === 2}
          <button
            class="reboot"
            on:click={() => onHandleSystemAction("ssh_restart")}
            title="Restart SSH service"><Fa icon={faSync} /> Restart</button
          >
        {/if}
      </div>
    {:else}
      <p>Loading...</p>
    {/if}
  </div>
</Card>

<style>
  /* Styles imported from system-tools.css */
</style>
