<script lang="ts">
  import { profilesStore } from "$lib/stores/profiles"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faSave, faCog } from "@fortawesome/free-solid-svg-icons"

  export let onSaveAs: () => void
  export let onManage: () => void

  $: currentLabel = $profilesStore.loadedFrom
    ? `Current (from ${
        $profilesStore.profiles.find((p) => p.id === $profilesStore.loadedFrom)
          ?.name || `Profile ${$profilesStore.loadedFrom}`
      })`
    : "Current"

  function handleProfileChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const value = target.value
    if (value === "current") {
      profilesStore.selectProfile("current")
    } else {
      profilesStore.selectProfile(parseInt(value, 10))
    }
  }
</script>

<div class="profile-selector">
  <select
    value={$profilesStore.selectedProfile}
    on:change={handleProfileChange}
    disabled={$profilesStore.isLoading}
  >
    <option value="current">{currentLabel}</option>
    {#each $profilesStore.profiles as profile (profile.id)}
      <option value={profile.id}>{profile.name}</option>
    {/each}
  </select>

  <button class="icon-button" on:click={onSaveAs} title="Save As...">
    <FontAwesomeIcon icon={faSave} />
  </button>

  <button class="icon-button" on:click={onManage} title="Manage Profiles">
    <FontAwesomeIcon icon={faCog} />
  </button>
</div>

<style>
  .profile-selector {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
  }

  select {
    flex: 1;
    min-width: 0;
    padding: 0.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: 1rem;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-button {
    padding: 0.5rem;
    border: none;
    border-radius: 5px;
    background-color: var(--card-border-color);
    color: var(--text-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
  }

  .icon-button:hover {
    background-color: var(--accent-color);
    color: white;
  }

  .icon-button:active {
    transform: scale(0.95);
  }
</style>
