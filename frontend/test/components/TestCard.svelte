<script>
  import Card from "../../src/lib/components/Card.svelte"
  export let title
</script>

<Card>
  <svelte:fragment slot="title">
    <h3>{title}</h3>
  </svelte:fragment>
</Card>
