<script lang="ts">
  import { profilesStore } from "$lib/stores/profiles"
  import { createEventDispatcher } from "svelte"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
  import { toast } from "svelte-sonner"

  export let isOpen = false

  const dispatch = createEventDispatcher()

  let editingId: number | null = null
  let editingName = ""

  function handleClose() {
    dispatch("close")
    cancelEdit()
  }

  function startEdit(id: number, currentName: string) {
    editingId = id
    editingName = currentName
  }

  function cancelEdit() {
    editingId = null
    editingName = ""
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) {
      toast.error("Profile name cannot be empty")
      return
    }

    try {
      await profilesStore.updateProfile(editingId, editingName.trim())
      toast.success("Profile renamed successfully")
      cancelEdit()
    } catch (e: any) {
      toast.error(e.message || "Failed to rename profile")
    }
  }

  async function deleteProfile(id: number, name: string) {
    const loadedFromThis = $profilesStore.loadedFrom === id
    const warningMessage = loadedFromThis
      ? `Delete profile "${name}"?\n\nWarning: Current settings were loaded from this profile.\n\nThis cannot be undone.`
      : `Delete profile "${name}"?\n\nThis cannot be undone.`

    if (!confirm(warningMessage)) {
      return
    }

    try {
      await profilesStore.deleteProfile(id)
      toast.success("Profile deleted successfully")
    } catch (e: any) {
      toast.error(e.message || "Failed to delete profile")
    }
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={handleClose}>
    <div class="modal-content" on:click|stopPropagation>
      <h2>Manage Profiles</h2>

      <div class="modal-body">
        {#if $profilesStore.profiles.length === 0}
          <p class="empty-message">
            No profiles yet. Create one using "Save As".
          </p>
        {:else}
          <div class="profile-list">
            {#each $profilesStore.profiles as profile (profile.id)}
              <div class="profile-item">
                {#if editingId === profile.id}
                  <input
                    type="text"
                    bind:value={editingName}
                    class="edit-input"
                    on:keydown={(e) => {
                      if (e.key === "Enter") saveEdit()
                      if (e.key === "Escape") cancelEdit()
                    }}
                    autofocus
                  />
                  <div class="button-group">
                    <button class="small primary" on:click={saveEdit}
                      >Save</button
                    >
                    <button class="small secondary" on:click={cancelEdit}
                      >Cancel</button
                    >
                  </div>
                {:else}
                  <span class="profile-name">
                    {profile.id}. {profile.name}
                    {#if $profilesStore.loadedFrom === profile.id}
                      <span class="loaded-badge">loaded</span>
                    {/if}
                  </span>
                  <div class="button-group">
                    <button
                      class="icon-button"
                      on:click={() => startEdit(profile.id, profile.name)}
                      title="Rename"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      class="icon-button danger"
                      on:click={() => deleteProfile(profile.id, profile.name)}
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="secondary" on:click={handleClose}>Close</button>
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
    max-width: 600px;
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
    min-height: 200px;
  }

  .empty-message {
    text-align: center;
    color: var(--text-color);
    opacity: 0.7;
    padding: 2rem;
  }

  .profile-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .profile-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--background-color);
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
  }

  .profile-name {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .loaded-badge {
    background-color: #28a745;
    color: white;
    font-size: 0.7em;
    font-weight: bold;
    padding: 0.15rem 0.4rem;
    border-radius: 10px;
    text-transform: uppercase;
  }

  .edit-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--accent-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: 1rem;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
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
  }

  .icon-button:hover {
    background-color: var(--accent-color);
    color: white;
  }

  .icon-button.danger:hover {
    background-color: #dc3545;
  }

  button.small {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  button.primary {
    background-color: var(--accent-color);
    color: white;
  }

  button.secondary {
    background-color: var(--card-border-color);
    color: var(--text-color);
  }

  button {
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  }

  button:hover {
    opacity: 0.9;
  }

  button:active {
    transform: scale(0.98);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--card-border-color);
  }
</style>
