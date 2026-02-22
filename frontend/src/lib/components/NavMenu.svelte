<script lang="ts">
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte"
  import Logo from "$lib/components/icons/Logo.svelte"
  import Fa from "svelte-fa"
  import {
    faHome,
    faTableCells,
    faCog,
    faInfoCircle,
    faBars,
  } from "@fortawesome/free-solid-svg-icons"

  let isOpen = false

  function toggleMenu() {
    isOpen = !isOpen
  }
</script>

<nav class:open={isOpen}>
  <div class="header">
    <button class="toggle-button" on:click={toggleMenu}>
      <Fa icon={faBars} size="1x" />
    </button>
    <div class="logo">
      <Logo />
    </div>
  </div>
  <ul>
    <li><a href="/"><Fa icon={faHome} size="1x" /><span>Home</span></a></li>
    <li>
      <a href="/leveling"
        ><Fa icon={faTableCells} size="1x" /><span>Leveling Tools</span></a
      >
    </li>
    <li>
      <a href="/system-tools"
        ><Fa icon={faCog} size="1x" /><span>System</span></a
      >
    </li>
    <li>
      <a href="/docs"><Fa icon={faInfoCircle} size="1x" /><span>Docs</span></a>
    </li>
    <li class="theme-switcher-item">
      <ThemeSwitcher {isOpen} />
    </li>
  </ul>
</nav>

<style>
  nav {
    background-color: var(--card-background-color);
    width: 60px;
    height: 100%; /* Fill the grid cell height */
    transition: width 0.3s;
    overflow-x: hidden; /* Hide horizontal overflow */
    z-index: 100;
    display: flex;
    flex-direction: column;
  }
  nav.open {
    width: 250px;
  }
  .header {
    display: flex;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
  }
  .toggle-button {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .logo {
    opacity: 0;
    transition: opacity 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
  }
  nav.open .logo {
    opacity: 1;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    flex-grow: 1; /* Allow the list to grow and push the last item down */
  }
  li a {
    display: flex;
    align-items: center;
    padding: 1rem;
    color: var(--text-color);
    text-decoration: none;
    white-space: nowrap;
  }
  li a :global(svg),
  li a :global(.fa-svg) {
    flex-shrink: 0;
    margin-right: 1rem;
  }
  li a :global(svg),
  li a :global(.fa-svg),
  .toggle-button :global(svg),
  .toggle-button :global(.fa-svg) {
    width: 1.5rem;
    height: 1.5rem;
  }
  li a span {
    opacity: 0;
    transition: opacity 0.2s;
  }
  nav.open li a span {
    opacity: 1;
  }

  li.theme-switcher-item {
    margin-top: auto; /* Pushes to the bottom */
    padding: 0;
  }

  nav.open li.theme-switcher-item {
    padding: 0.5rem 0;
  }
</style>
