<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let isOpen = false
  let slotNumber: number | null = null

  const dispatch = createEventDispatcher()

  function handleSave() {
    if (slotNumber !== null && slotNumber >= 0 && slotNumber <= 99) {
      dispatch("save", { slot: slotNumber })
    }
  }

  function handleClose() {
    dispatch("close")
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose()
    }
    if (event.key === "Enter") {
      handleSave()
    }
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose()
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    on:click={handleClose}
    on:keydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
  >
    <div
      class="modal"
      on:click|stopPropagation
      on:keydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <h3 id="modal-title">Save Active Mesh</h3>
      <p>Enter a slot number (0-99) to save the current active mesh.</p>
      <div class="form-group">
        <label for="slot-number">Slot Number</label>
        <input
          type="number"
          id="slot-number"
          bind:value={slotNumber}
          min="0"
          max="99"
          placeholder="e.g., 3"
        />
      </div>
      <div class="button-group">
        <button on:click={handleClose}>Cancel</button>
        <button
          class="primary"
          on:click={handleSave}
          disabled={slotNumber == null}>Save</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .modal {
    background-color: var(--card-background-color);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 90%;
    max-width: 400px;
  }

  h3 {
    margin: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  input {
    padding: 0.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
  }

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 5px;
    background-color: var(--card-border-color);
    color: var(--text-color);
    font-weight: bold;
    cursor: pointer;
  }
  button.primary {
    background-color: var(--accent-color);
    color: white;
  }
</style>
