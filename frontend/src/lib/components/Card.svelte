<script lang="ts">
  export let noPadding = false
  export let style = ""
</script>

<div class="card" class:no-padding={noPadding} {style}>
  <slot name="title" />
  <slot />
</div>

<style>
  .card {
    background-color: var(--card-background-color);
    border-radius: 8px;
    padding: 0.75rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
  }
  .no-padding {
    padding: 0;
  }

  /* Global card title style used across all cards */
  :global(.card-title) {
    margin: 0;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--card-border-color);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85em;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    opacity: 0.75;
  }
</style>
