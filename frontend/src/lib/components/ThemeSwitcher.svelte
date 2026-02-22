<script lang="ts">
  import { onMount } from "svelte"
  import { theme, type Theme } from "$lib/stores/theme"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import {
    faSun,
    faMoon,
    faWandMagicSparkles,
  } from "@fortawesome/free-solid-svg-icons"
  import { toast } from "svelte-sonner"

  export let isOpen: boolean = false

  const themes: { name: Theme; icon: any }[] = [
    { name: "light", icon: faSun },
    { name: "dark", icon: faMoon },
    { name: "auto", icon: faWandMagicSparkles },
  ]

  $: currentTheme = themes.find((t) => t.name === $theme) ?? themes[2]

  const themeLabels: Record<Theme, string> = {
    light: "Light",
    dark: "Dark",
    auto: "Auto",
  }

  function rotateTheme() {
    const currentIndex = themes.findIndex((t) => t.name === currentTheme.name)
    const nextThemeIndex = (currentIndex + 1) % themes.length
    const newTheme = themes[nextThemeIndex].name
    $theme = newTheme
    toast.success(`Theme changed to ${themeLabels[newTheme]}`)
  }

  function setTheme(newTheme: Theme) {
    $theme = newTheme
    toast.success(`Theme changed to ${themeLabels[newTheme]}`)
  }

  let mounted = false
  onMount(() => {
    mounted = true
  })
</script>

{#if mounted}
  <div class="theme-switcher">
    {#if isOpen}
      <div class="expanded-switcher">
        {#each themes as themeItem}
          <button
            class:active={$theme === themeItem.name}
            on:click={() => setTheme(themeItem.name)}
            aria-label="{themeItem.name} theme"
            title="{themeItem.name.charAt(0).toUpperCase() +
              themeItem.name.slice(1)} Theme"
          >
            <FontAwesomeIcon icon={themeItem.icon} />
          </button>
        {/each}
      </div>
    {:else}
      {#key $theme}
        <button
          class="collapsed-switcher"
          on:click={rotateTheme}
          aria-label="Rotate theme"
          title="Theme: {themeLabels[currentTheme.name]}. Click to switch."
        >
          <FontAwesomeIcon icon={currentTheme.icon} />
        </button>
      {/key}
    {/if}
  </div>
{/if}

<style>
  .theme-switcher {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .expanded-switcher {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 0 1rem;
    gap: 0.5rem;
  }

  .collapsed-switcher {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    width: 100%;
    white-space: nowrap;
  }

  :global(nav:not(.open)) .collapsed-switcher {
    justify-content: center;
  }

  :global(nav.open) .collapsed-switcher {
    justify-content: flex-start;
  }

  button {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 5px;
    font-size: 1rem;
  }

  button.active {
    background-color: var(--accent-color);
    color: var(--background-color);
  }

  button :global(svg),
  button :global(.fa-svg) {
    width: 1rem;
    height: 1rem;
  }
</style>
