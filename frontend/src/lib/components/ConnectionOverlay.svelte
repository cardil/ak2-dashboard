<script lang="ts">
  import {
    kobraConnectionStore,
    type KobraConnectionStatus,
  } from "$lib/stores/kobraConnection"

  let status: KobraConnectionStatus
  kobraConnectionStore.subscribe((value) => {
    status = value
  })

  const messages: Record<
    KobraConnectionStatus,
    { title: string; body: string } | null
  > = {
    initializing: null,
    connecting: {
      title: "Connecting...",
      body: "Connecting to Kobra Unleashed API...",
    },
    connected: null,
    error: {
      title: "Connection Error",
      body: "Could not connect to the Kobra Unleashed API. Please ensure it is running and the URL is configured correctly.",
    },
    unavailable: {
      title: "API Not Configured",
      body: "The Kobra Unleashed API URL has not been configured in the webserver settings.",
    },
  }

  $: message = messages[status]
</script>

{#if message}
  <div class="overlay">
    <div class="message-box">
      <h3>{message.title}</h3>
      <p>{message.body}</p>
      <a
        href="https://github.com/cardil/ak2-dashboard/blob/main/INSTALL.md#kobra-unleashed-integration"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Setup Instructions
      </a>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    z-index: 10;
  }
  .message-box {
    background-color: var(--card-background-color);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    max-width: 80%;
  }
  h3 {
    margin-bottom: 1rem;
  }
  p {
    margin-bottom: 1.5rem;
  }
  a {
    color: var(--accent-color);
  }
</style>
