<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import FileBrowser from "$lib/components/FileBrowser.svelte"
  import { faFolderOpen } from "@fortawesome/free-solid-svg-icons"
  import Fa from "svelte-fa"
  import "./system-tools.css"
</script>

<Card>
  <svelte:fragment slot="title">
    <h3 class="card-title"><Fa icon={faFolderOpen} /> File Browser</h3>
  </svelte:fragment>
  <div class="tool-section file-browser-section">
    <FileBrowser />
  </div>
</Card>

<style>
  /* Styles imported from system-tools.css */

  .file-browser-section {
    padding: 0;
    overflow: hidden;
    min-height: 0;
    min-width: 0;
  }
</style>
