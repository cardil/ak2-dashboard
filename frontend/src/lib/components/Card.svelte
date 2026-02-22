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
    padding: 1rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
    min-width: 0;
  }
  .no-padding {
    padding: 0;
  }
</style>
