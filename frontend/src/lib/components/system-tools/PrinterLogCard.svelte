<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import { logStore } from "$lib/stores/log"
  import {
    faFileLines,
    faSync,
    faTimes,
    faPlay,
    faPause,
  } from "@fortawesome/free-solid-svg-icons"
  import Fa from "svelte-fa"
  import { onMount, onDestroy } from "svelte"
  import "./system-tools.css"

  export let onShowConfirmationModal: (action: "clearLog") => void

  let logContentElement: HTMLDivElement
  let isFollowing = false
  let shouldAutoScroll = true

  function toggleFollow() {
    if (isFollowing) {
      logStore.stopFollow()
      isFollowing = false
    } else {
      logStore.startFollow()
      isFollowing = true
      shouldAutoScroll = true
      // Scroll to bottom when starting follow
      setTimeout(() => scrollToBottom(), 100)
    }
  }

  function scrollToBottom() {
    if (logContentElement && shouldAutoScroll) {
      logContentElement.scrollTop = logContentElement.scrollHeight
    }
  }

  function handleScroll() {
    if (!logContentElement) return
    const { scrollTop, scrollHeight, clientHeight } = logContentElement
    // If user scrolls up, disable auto-scroll
    // If user scrolls near bottom, re-enable auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
    shouldAutoScroll = isNearBottom
  }

  onMount(() => {
    logStore.fetchLog()
    // Subscribe to log updates to auto-scroll when following
    const unsubscribe = logStore.subscribe(() => {
      if (isFollowing) {
        setTimeout(() => scrollToBottom(), 50)
      }
    })
    return () => {
      unsubscribe()
    }
  })

  onDestroy(() => {
    // Stop following when component is destroyed
    if (isFollowing) {
      logStore.stopFollow()
    }
  })
</script>

<Card>
  <svelte:fragment slot="title">
    <h3 class="card-title"><Fa icon={faFileLines} /> Printer Log</h3>
  </svelte:fragment>
  <div class="tool-section log-container">
    <div
      class="log-content"
      bind:this={logContentElement}
      on:scroll={handleScroll}
      class:following={isFollowing}
    >
      {#each $logStore as entry}
        <div
          class="log-line"
          class:error={entry.line.toLowerCase().includes("error")}
          class:warning={entry.line.toLowerCase().includes("warn")}
          class:partial-indicator={entry.isPartialIndicator}
        >
          {entry.line}{#if entry.count > 1}<span class="log-count"
              >x{entry.count}</span
            >{/if}
        </div>
      {/each}
    </div>
    <div class="fab-container">
      <button
        class="fab"
        class:active={isFollowing}
        on:click={toggleFollow}
        title={isFollowing ? "Stop following log" : "Follow log"}
      >
        <Fa icon={isFollowing ? faPause : faPlay} />
      </button>
      {#if !isFollowing}
        <button class="fab" on:click={logStore.fetchLog} title="Refresh log"
          ><Fa icon={faSync} /></button
        >
      {/if}
      <button
        class="fab danger"
        on:click={() => onShowConfirmationModal("clearLog")}
        title="Clear log"><Fa icon={faTimes} /></button
      >
    </div>
  </div>
</Card>

<style>
  /* Styles imported from system-tools.css */

  .log-container {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    min-width: 0;
    min-height: 0;
  }

  .log-content {
    flex-grow: 1;
    overflow: auto;
    overflow-x: auto;
    overflow-y: auto;
    padding: 0;
    margin: 0;
    border-radius: 5px;
    font-family: monospace;
    font-size: 0.9em;
    min-width: 0;
    min-height: 0;
  }

  .log-content.following {
    border: 2px solid var(--accent-color);
    box-shadow: 0 0 8px rgba(0, 123, 255, 0.3);
  }

  :global(body[data-theme="dark"]) .log-content.following {
    box-shadow: 0 0 8px rgba(255, 193, 7, 0.3);
  }

  .log-line {
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
    padding: 0.25rem 0.5rem;
  }

  .log-line:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .log-line.error {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    font-weight: bold;
  }

  .log-line.error:hover {
    background-color: rgba(220, 53, 69, 0.25);
  }

  .log-line.warning {
    background-color: rgba(255, 193, 7, 0.1);
    color: #ffc107;
    font-weight: bold;
  }

  .log-line.warning:hover {
    background-color: rgba(255, 193, 7, 0.25);
  }

  .log-line.partial-indicator {
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    text-align: center;
    background-color: rgba(255, 193, 7, 0.15);
    color: #ffc107;
    font-weight: bold;
    border: 2px solid #ffc107;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    margin: 0.5rem 0;
  }

  .log-line.partial-indicator:hover {
    background-color: rgba(255, 193, 7, 0.25);
  }

  .log-count {
    display: inline;
    color: #007bff;
    font-size: 0.85em;
    margin-left: 0.5rem;
  }

  /* Dark mode styles */
  :global(body[data-theme="dark"]) .log-line:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :global(body[data-theme="dark"]) .log-line.error:hover {
    background-color: rgba(220, 53, 69, 0.3);
  }

  :global(body[data-theme="dark"]) .log-line.warning {
    background-color: rgba(255, 193, 7, 0.15);
    color: #ffc107;
  }

  :global(body[data-theme="dark"]) .log-line.warning:hover {
    background-color: rgba(255, 193, 7, 0.3);
  }

  :global(body[data-theme="dark"]) .log-line.partial-indicator {
    background-color: rgba(255, 193, 7, 0.2);
    color: #ffc107;
  }

  :global(body[data-theme="dark"]) .log-line.partial-indicator:hover {
    background-color: rgba(255, 193, 7, 0.3);
  }

  :global(body[data-theme="dark"]) .log-count {
    color: #ffc107;
  }

  .fab-container {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    gap: 0.5rem;
  }

  .fab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    padding: 0;
    border-radius: 50%;
    border: none;
    background-color: var(--accent-color);
    color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }

  .fab.danger {
    background-color: #dc3545;
  }

  .fab.active {
    background-color: #28a745;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
