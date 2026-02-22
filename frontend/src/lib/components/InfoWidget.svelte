<script lang="ts">
  export let label: string
  export let title: string = ""
</script>

<div class="info-widget" {title}>
  <span class="label">{label}</span>
  <div class="value">
    <slot />
  </div>
</div>

<style>
  .info-widget {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-grow: 1;
    text-align: left;
  }
  .label {
    font-size: 0.8em;
    opacity: 0.8;
  }
  .value {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
  }
</style>
