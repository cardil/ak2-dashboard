<script lang="ts">
  import { profilesStore } from "$lib/stores/profiles"

  interface Props {
    isOpen?: boolean
    onclose?: () => void
    onsave?: (detail: {
      target: "new" | "current" | number
      name?: string
    }) => void
  }

  let { isOpen = false, onclose, onsave }: Props = $props()

  let selectedTarget: "new" | "current" | number = $state("new")
  let newProfileName = $state("")

  const sourceIsProfile = $derived($profilesStore.selectedProfile !== "current")
  const showCurrentOption = $derived(sourceIsProfile)

  function handleClose() {
    onclose?.()
    resetForm()
  }

  function handleSave() {
    if (selectedTarget === "new" && !newProfileName.trim()) {
      alert("Please enter a profile name")
      return
    }

    if (selectedTarget === "current") {
      const confirmed = confirm(
        "⚠️ Warning: This will overwrite the active printer configuration and reboot the printer. Are you sure?",
      )
      if (!confirmed) {
        return
      }
    }

    onsave?.({
      target: selectedTarget,
      name: selectedTarget === "new" ? newProfileName.trim() : undefined,
    })
    resetForm()
  }

  function resetForm() {
    selectedTarget = "new"
    newProfileName = ""
  }

  $effect(() => {
    if (isOpen) {
      // Reset form when modal opens
      resetForm()
    }
  })

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleClose()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose()
    }
  }

  const sourceProfileName = $derived(
    typeof $profilesStore.selectedProfile === "number"
      ? $profilesStore.profiles.find(
          (p) => p.id === $profilesStore.selectedProfile,
        )?.name || `Profile ${$profilesStore.selectedProfile}`
      : "Current",
  )
</script>

{#if isOpen}
  <div
    class="modal-overlay"
    onclick={handleClose}
    onkeydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <h2 id="modal-title">
        Save "{sourceProfileName}" As...
      </h2>

      <div class="modal-body">
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              name="target"
              value="new"
              bind:group={selectedTarget}
            />
            <span>New Profile:</span>
            <input
              type="text"
              bind:value={newProfileName}
              placeholder="Enter profile name"
              disabled={selectedTarget !== "new"}
              class="profile-name-input"
            />
          </label>

          {#if showCurrentOption}
            <label class="radio-option warning">
              <input
                type="radio"
                name="target"
                value="current"
                bind:group={selectedTarget}
              />
              <span class="warning-text"
                >⚠️ Current (Apply to Printer & Reboot)</span
              >
            </label>
          {/if}

          {#each $profilesStore.profiles as profile (profile.id)}
            {#if profile.id !== $profilesStore.selectedProfile}
              <label class="radio-option">
                <input
                  type="radio"
                  name="target"
                  value={profile.id}
                  bind:group={selectedTarget}
                />
                <span>{profile.name} (overwrite)</span>
              </label>
            {/if}
          {/each}
        </div>
      </div>

      <div class="modal-footer">
        <button class="secondary" onclick={handleClose}>Cancel</button>
        <button class="primary" onclick={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: var(--card-background-color);
    border-radius: 10px;
    padding: 1.5rem;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  h2 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    border-bottom: 1px solid var(--card-border-color);
    padding-bottom: 0.5rem;
  }

  .modal-body {
    margin-bottom: 1.5rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .radio-option:hover {
    background-color: var(--background-color);
  }

  .radio-option.warning {
    border-color: #ffc107;
    background-color: rgba(255, 193, 7, 0.1);
  }

  .warning-text {
    color: #ffc107;
    font-weight: bold;
  }

  input[type="radio"] {
    cursor: pointer;
  }

  .profile-name-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
  }

  .profile-name-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  }

  button.primary {
    background-color: var(--accent-color);
    color: white;
  }

  button.secondary {
    background-color: var(--card-border-color);
    color: var(--text-color);
  }

  button:hover {
    opacity: 0.9;
  }

  button:active {
    transform: scale(0.98);
  }
</style>
