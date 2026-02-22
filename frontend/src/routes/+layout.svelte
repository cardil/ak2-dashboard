<script lang="ts">
  import favicon from "$lib/assets/favicon.svg"
  import NavMenu from "$lib/components/NavMenu.svelte"
  import { effectiveTheme } from "$lib/stores/theme"
  import { browser } from "$app/environment"
  import { Toaster } from "svelte-sonner"

  if (browser) {
    effectiveTheme.subscribe((value) => {
      document.body.dataset.theme = value
      // Update color-scheme meta tag to match current theme for Dark Reader detection
      const metaColorScheme = document.querySelector(
        'meta[name="color-scheme"]',
      )
      if (metaColorScheme) {
        metaColorScheme.setAttribute("content", value)
      }
    })
  }

  if (browser && import.meta.env.DEV) {
    import("$lib/dev/mockProxy").then(({ initializeMockProxy }) => {
      initializeMockProxy()
    })
  }

  let { children } = $props()
</script>

<svelte:head>
  <title>AK2 Dashboard</title>
  <meta name="color-scheme" content={$effectiveTheme} />
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app-container">
  <NavMenu />
  <main>
    {@render children()}
  </main>
  <Toaster position="top-center" theme={$effectiveTheme} />
</div>

<style>
  :root {
    --background-color: #ffffff;
    --text-color: #000000;
    --card-background-color: #f0f0f0;
    --card-border-color: #e0e0e0;
    --accent-color: #007bff;
    --accent-color-dark: #005bdf;
    --letterbox-color: lightgray;
  }

  :global(body[data-theme="dark"]) {
    --background-color: #121212;
    --text-color: #ffffff;
    --card-background-color: #1e1e1e;
    --card-border-color: #2e2e2e;
    --letterbox-color: #000;
    color-scheme: dark;
  }

  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  :global(body) {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    transition:
      background-color 0.2s,
      color 0.2s;
    font-size: 0.9rem;
  }

  :global(button:disabled) {
    background-color: #6c757d !important;
    cursor: not-allowed !important;
    color: #ced4da !important;
  }

  .app-container {
    display: grid;
    grid-template-columns: auto 1fr; /* Nav is auto, content takes the rest */
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-width: 0;
    overflow: hidden;
  }

  /* Ensure toaster appears on top and matches card background */
  :global([data-sonner-toaster]) {
    z-index: 1000;
  }

  :global([data-sonner-toast]) {
    background-color: var(--card-background-color) !important;
    color: var(--text-color) !important;
    border: 2px solid var(--card-border-color) !important;
  }
</style>
