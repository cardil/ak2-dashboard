<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let isOpen = false
  export let title = ""
  export let message = ""
  export let buttons: { label: string; class?: string; event: string }[] = []

  const dispatch = createEventDispatcher()

  function handleAction(event: string) {
    dispatch(event)
  }

  function handleBackdropClick() {
    // Find a cancel or close button to dispatch its event
    const cancelBtn = buttons.find(
      (b) => b.event === "close" || b.event === "cancel",
    )
    if (cancelBtn) {
      dispatch(cancelBtn.event)
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleBackdropClick()
    }
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return
    // Handle keyboard events on backdrop for accessibility
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleBackdropClick()
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
    aria-label="Close modal"
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
      <h3 id="modal-title">{title}</h3>
      <p>{message}</p>
      <div class="button-group">
        {#each buttons as button}
          <button
            class={button.class || ""}
            on:click={() => handleAction(button.event)}
          >
            {button.label}
          </button>
        {/each}
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
    max-width: 500px;
  }

  h3 {
    margin: 0;
    font-size: 1.5em;
  }

  p {
    white-space: pre-wrap; /* This will respect newlines in the message string */
    line-height: 1.6;
  }

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
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
  button.danger {
    background-color: #dc3545;
    color: white;
  }
  button.reboot {
    background-color: #ffc107;
    color: black;
  }
</style>
