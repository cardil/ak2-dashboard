<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import BedMeshVisualizer from "$lib/components/BedMeshVisualizer.svelte"
  import BedMeshDataTable from "$lib/components/BedMeshDataTable.svelte"
  import SaveMeshModal from "$lib/components/SaveMeshModal.svelte"
  import ProfileSelector from "$lib/components/ProfileSelector.svelte"
  import SaveAsModal from "$lib/components/SaveAsModal.svelte"
  import ProfileManagerModal from "$lib/components/ProfileManagerModal.svelte"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import {
    faCogs,
    faTh,
    faSave,
    faEye,
    faCheckCircle,
    faTrash,
    faFileMedical,
    faHdd,
    faUser,
  } from "@fortawesome/free-solid-svg-icons"
  import { get } from "svelte/store"
  import { levelingStore } from "$lib/stores/leveling"
  import { profilesStore } from "$lib/stores/profiles"
  import type { MeshProfile } from "$lib/stores/leveling"
  import Spinner from "$lib/components/Spinner.svelte"
  import InfoModal from "$lib/components/InfoModal.svelte"
  import { toast } from "svelte-sonner"

  type ModalButton = {
    label: string
    event: string
    class?: string
  }

  // --- Modal State ---
  let modalState: "closed" | "confirm_grid_change" | "reboot_needed" = "closed"
  let modalInfo: { title: string; message: string; buttons: ModalButton[] } = {
    title: "",
    message: "",
    buttons: [],
  }

  // --- Component State ---
  let isEditing = false
  let editedMeshData: number[][] = []
  let visualizedMeshData: number[][] = []
  let visualizedSlotId: number | string | null = null
  let activeSlotId: number | string | null = null
  let isSaveAsModalOpen = false
  let isProfileManagerModalOpen = false

  $: if ($levelingStore.activeMesh) {
    const activeDataString = JSON.stringify($levelingStore.activeMesh.data)
    const foundSlot = $levelingStore.savedMeshes.find(
      (s) => JSON.stringify(s.data) === activeDataString,
    )
    if (foundSlot) {
      activeSlotId = foundSlot.id
    } else {
      const averageMesh = $levelingStore.averageMesh
      if (
        averageMesh &&
        JSON.stringify(averageMesh.data) === activeDataString
      ) {
        activeSlotId = "average"
      } else {
        activeSlotId = "active" // Not matching any saved slot
      }
    }
  }

  // --- UI Functions ---

  let isSaveModalOpen = false
  let localSettings = {
    gridSize: 5,
    bedTemp: 60,
    precision: 0.01,
  }

  // --- Store Subscription ---
  levelingStore.subscribe((store) => {
    if (store.settings && !store.isUpdating) {
      localSettings = { ...store.settings }
    }
    // Initialize visualized data with the active mesh from the store
    if (store.activeMesh && visualizedSlotId === null) {
      visualizedMeshData = store.activeMesh.data
      visualizedSlotId = "active"
    }
  })

  // Reactive block to handle cases where the visualized mesh is deleted from the store
  $: if (
    $levelingStore.activeMesh &&
    visualizedSlotId &&
    visualizedSlotId !== "active" &&
    visualizedSlotId !== "average" &&
    !$levelingStore.savedMeshes.find((s) => s.id === visualizedSlotId)
  ) {
    visualizeSlot($levelingStore.activeMesh)
  }

  // Ensure the visualizer updates when the active mesh data changes from the store
  $: if (visualizedSlotId === "active" && $levelingStore.activeMesh) {
    visualizedMeshData = $levelingStore.activeMesh.data
  }

  // Ensure the visualizer updates when the average mesh data changes from the store
  $: if (visualizedSlotId === "average" && $levelingStore.averageMesh) {
    visualizedMeshData = $levelingStore.averageMesh.data
  }

  // --- UI Functions ---

  function enterEditMode() {
    // Create a deep copy of the data for editing
    editedMeshData = JSON.parse(JSON.stringify(visualizedMeshData))
    visualizedSlotId = null // Remove visualized state
    isEditing = true
  }

  function visualizeSlot(slot: MeshProfile) {
    if (slot) {
      if (isEditing) {
        if (
          !confirm(
            "Are you sure you want to cancel editing? All changes will be lost.",
          )
        ) {
          return
        }
        isEditing = false
      }
      visualizedMeshData = slot.data
      visualizedSlotId = slot.id
    }
  }

  function activateSlot(slotToActivate: MeshProfile) {
    if (typeof slotToActivate.id === "number") {
      levelingStore.activateSlot(slotToActivate.id)
    } else if (slotToActivate.id === "average") {
      levelingStore.activateAverageMesh()
    }
  }

  async function handleSaveSettings() {
    if (!$levelingStore.settings) return

    if (localSettings.gridSize !== $levelingStore.settings.gridSize) {
      modalInfo = {
        title: "Confirm Grid Size Change",
        message: [
          "Changing the grid size is a destructive operation with the following consequences:",
          "- All saved mesh profiles will be deleted.",
          "- The current active mesh will be zeroed out.",
          "- The printer MUST be rebooted.",
          "- Bed leveling MUST be performed again after reboot.",
          "\nAre you sure you want to continue?",
        ].join("\n\n"),
        buttons: [
          { label: "Cancel", event: "cancel", class: "" },
          { label: "Confirm", event: "confirm", class: "danger" },
        ],
      }
      modalState = "confirm_grid_change"
    } else {
      await executeSaveSettings()
    }
  }

  async function executeSaveSettings() {
    try {
      const response = await levelingStore.saveSettings(localSettings)
      modalState = "closed"
      if (response.grid_size_changed) {
        modalInfo = {
          title: "Reboot Required",
          message:
            "Grid size has been changed and all mesh data has been reset.\n\nA printer reboot is required for the changes to take full effect.",
          buttons: [
            { label: "Later", event: "close", class: "" },
            { label: "Reboot Printer", event: "reboot", class: "reboot" },
          ],
        }
        modalState = "reboot_needed"
        toast.warning("Settings saved. Reboot required for grid size change.")
      } else {
        toast.success("Settings saved successfully")
      }
    } catch (error) {
      toast.error("Failed to save settings")
    }
  }

  function handleReboot() {
    // Mocking reboot by reloading the page
    window.location.reload()
  }

  async function handleSaveMesh(event: CustomEvent<{ slot: number }>) {
    const slotId = event.detail.slot
    isSaveModalOpen = false

    try {
      if (isEditing) {
        await levelingStore.saveEditedMesh(slotId, editedMeshData)
        isEditing = false
        toast.success(`Mesh saved to slot ${slotId}`)
        const savedMesh = get(levelingStore).savedMeshes.find(
          (s) => s.id === slotId,
        )
        if (savedMesh) {
          visualizeSlot(savedMesh)
        }
      } else {
        await levelingStore.saveActiveMesh(slotId)
        toast.success(`Active mesh saved to slot ${slotId}`)
        const savedMesh = get(levelingStore).savedMeshes.find(
          (s) => s.id === slotId,
        )
        if (savedMesh) {
          visualizeSlot(savedMesh)
        }
      }
    } catch (error) {
      toast.error(`Failed to save mesh to slot ${slotId}`)
    }
  }

  function deleteSlot(slotId: number) {
    if (confirm(`Are you sure you want to delete slot ${slotId}?`)) {
      levelingStore.deleteSlot(slotId)
    }
  }

  function deleteAllSlots() {
    if (
      confirm(
        "Are you sure you want to delete ALL saved mesh profiles? This cannot be undone.",
      )
    ) {
      levelingStore.deleteAllSlots()
    }
  }

  async function handleSaveAs(detail: { target: any; name?: string }) {
    isSaveAsModalOpen = false
    const { target, name } = detail

    try {
      const sourceId = $profilesStore.selectedProfile
      await profilesStore.saveAs(sourceId, target, name)

      if (target === "current") {
        toast.success("Profile applied to printer. Reboot required.")
      } else if (target === "new") {
        toast.success(`Profile "${name}" created successfully`)
      } else {
        toast.success("Profile saved successfully")
      }

      // Refetch leveling data if we're still on the same profile
      await levelingStore.fetchData()
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile")
    }
  }

  // Reactive label for mesh based on selection
  $: meshLabel =
    $profilesStore.selectedProfile === "current" ? "Active Mesh" : "Saved Mesh"

  // Watch for profile changes and refetch data
  $: if ($profilesStore.selectedProfile) {
    // Reset visualization state when switching profiles
    visualizedSlotId = null
    visualizedMeshData = []
    levelingStore.fetchData()
  }
</script>

{#if $levelingStore.isLoading}
  <div class="loading-container"><Spinner /></div>
{:else if $levelingStore.error}
  <div class="error-container">Error: {$levelingStore.error}</div>
{:else}
  {#if $levelingStore.isUpdating}
    <div class="updating-overlay">
      <Spinner />
    </div>
  {/if}
  <div class="page-container">
    <div class="column">
      <!-- Profile Selector Card -->
      <Card>
        <svelte:fragment slot="title">
          <h3 class="card-title">
            <FontAwesomeIcon icon={faUser} /> Profile
          </h3>
        </svelte:fragment>
        <ProfileSelector
          onSaveAs={() => (isSaveAsModalOpen = true)}
          onManage={() => (isProfileManagerModalOpen = true)}
        />
      </Card>

      <div class="column-group">
        <!-- Leveling Settings Card -->
        <Card>
          <svelte:fragment slot="title">
            <h3 class="card-title">
              <FontAwesomeIcon icon={faCogs} /> Leveling Settings
            </h3>
          </svelte:fragment>
          <div class="settings-form">
            <div class="form-group">
              <label for="grid">Grid Size</label>
              <input
                type="number"
                id="grid"
                bind:value={localSettings.gridSize}
                min="2"
                max="10"
                disabled={$levelingStore.rebootNeeded}
              />
            </div>
            <div class="form-group">
              <label for="bed_temp">Bed Temp (°C)</label>
              <input
                type="number"
                id="bed_temp"
                bind:value={localSettings.bedTemp}
                min="0"
                max="90"
                disabled={$levelingStore.rebootNeeded}
              />
            </div>
            <div class="form-group">
              <label
                for="precision"
                title="Controls the rounding precision when calculating the average of saved mesh profiles. Values are rounded to the nearest precision step (e.g., 0.01 rounds to nearest 0.01mm)."
                >Avg. Precision</label
              >
              <input
                type="number"
                id="precision"
                bind:value={localSettings.precision}
                step="0.001"
                disabled={$levelingStore.rebootNeeded}
                title="Controls the rounding precision when calculating the average of saved mesh profiles. Values are rounded to the nearest precision step (e.g., 0.01 rounds to nearest 0.01mm)."
              />
            </div>
            <div class="form-group button-group">
              {#if $levelingStore.rebootNeeded}
                <button class="reboot" on:click={handleReboot}
                  ><FontAwesomeIcon icon={faSave} /> Reboot Printer</button
                >
              {:else}
                <button class="primary" on:click={handleSaveSettings}
                  ><FontAwesomeIcon icon={faSave} /> Save</button
                >
              {/if}
            </div>
          </div>
        </Card>

        <!-- Bed Mesh Card -->
        <Card>
          <svelte:fragment slot="title">
            <h3 class="card-title"><FontAwesomeIcon icon={faTh} /> Bed Mesh</h3>
          </svelte:fragment>
          <div class="mesh-list">
            {#if $levelingStore.activeMesh}
              <div
                class="mesh-item"
                class:active={visualizedSlotId === "active"}
              >
                <span
                  >{meshLabel} (Z-Offset: {$levelingStore.activeMesh
                    .zOffset})</span
                >
                <div class="button-group">
                  <button
                    class="small primary"
                    on:click={() => (isSaveModalOpen = true)}
                  >
                    <FontAwesomeIcon icon={faSave} /> Save
                  </button>
                  <button
                    class="small"
                    on:click={() =>
                      $levelingStore.activeMesh &&
                      visualizeSlot($levelingStore.activeMesh)}
                    disabled={visualizedSlotId === "active"}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Visualize
                  </button>
                </div>
              </div>
            {/if}

            <!-- Average Mesh Special Slot -->
            {#if $levelingStore.averageMesh}
              <div
                class="mesh-item"
                class:active={visualizedSlotId === "average"}
              >
                <span class="slot-name">
                  Average
                  {#if activeSlotId === "average"}
                    <span class="active-label">active</span>
                  {/if}
                </span>
                <div class="button-group">
                  <button
                    class="small"
                    on:click={() => levelingStore.activateAverageMesh()}
                    disabled={activeSlotId === "average"}
                    ><FontAwesomeIcon icon={faCheckCircle} /> Activate</button
                  >
                  <button
                    class="small"
                    on:click={() =>
                      $levelingStore.averageMesh &&
                      visualizeSlot($levelingStore.averageMesh)}
                    disabled={visualizedSlotId === "average"}
                    ><FontAwesomeIcon icon={faEye} />
                    Visualize
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </Card>
      </div>

      <!-- Saved Bed Meshes Card -->
      <Card style="flex-grow: 1; min-height: 0;">
        <svelte:fragment slot="title">
          <h3 class="card-title">
            <FontAwesomeIcon icon={faHdd} /> Saved Bed Meshes
          </h3>
        </svelte:fragment>
        <div class="mesh-list">
          {#each $levelingStore.savedMeshes as slot (slot.id)}
            <div class="mesh-item" class:active={slot.id === visualizedSlotId}>
              <span class="slot-name">
                {slot.name}
                {#if slot.id === activeSlotId}
                  <span class="active-label">active</span>
                {/if}
              </span>
              <div class="button-group">
                <button
                  class="small"
                  on:click={() => activateSlot(slot)}
                  disabled={slot.id === activeSlotId}
                  ><FontAwesomeIcon icon={faCheckCircle} /> Activate</button
                >
                <button
                  class="small"
                  on:click={() => visualizeSlot(slot)}
                  disabled={slot.id === visualizedSlotId}
                >
                  <FontAwesomeIcon icon={faEye} />
                  Visualize
                </button>
                <button
                  class="small danger"
                  on:click={() => {
                    if (typeof slot.id === "number") {
                      deleteSlot(slot.id)
                    }
                  }}><FontAwesomeIcon icon={faTrash} /> Delete</button
                >
              </div>
            </div>
          {/each}
        </div>
        <div class="button-group spaced">
          <button class="danger" on:click={deleteAllSlots}
            ><FontAwesomeIcon icon={faTrash} /> Delete all</button
          >
        </div>
      </Card>
    </div>

    <div class="column visualizer-column">
      <!-- Bed Mesh Visualizer Card -->
      <Card style="height: 100%;">
        <svelte:fragment slot="title">
          <h3 class="card-title">
            <FontAwesomeIcon icon={faFileMedical} />
            {isEditing ? "Bed Mesh Editor" : "Bed Mesh Visualizer"}
          </h3>
        </svelte:fragment>
        <div class="visualizer-content">
          <div class="visualizer-wrapper">
            <BedMeshVisualizer
              meshData={isEditing ? editedMeshData : visualizedMeshData}
              {isEditing}
              on:edit={enterEditMode}
              on:save={() => (isSaveModalOpen = true)}
            />
          </div>
          <BedMeshDataTable
            meshData={visualizedMeshData}
            {isEditing}
            bind:editedMeshData
          />
        </div>
      </Card>
    </div>

    <SaveMeshModal
      isOpen={isSaveModalOpen}
      on:close={() => (isSaveModalOpen = false)}
      on:save={handleSaveMesh}
    />
    <InfoModal
      isOpen={modalState !== "closed"}
      title={modalInfo.title}
      message={modalInfo.message}
      buttons={modalInfo.buttons}
      on:cancel={() => (modalState = "closed")}
      on:close={() => (modalState = "closed")}
      on:confirm={() => executeSaveSettings()}
      on:reboot={() => handleReboot()}
    />
    <SaveAsModal
      isOpen={isSaveAsModalOpen}
      onclose={() => (isSaveAsModalOpen = false)}
      onsave={(detail) => handleSaveAs(detail)}
    />
    <ProfileManagerModal
      isOpen={isProfileManagerModalOpen}
      onclose={() => (isProfileManagerModalOpen = false)}
    />
  </div>
{/if}

<style>
  .page-container {
    display: grid;
    grid-template-columns: 35% 1fr;
    gap: 1rem;
    padding: 1rem;
    height: 100%;
  }

  .loading-container,
  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .updating-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
  }

  .column-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .visualizer-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }

  .visualizer-wrapper {
    flex: 1;
    min-height: 0;
  }

  .visualizer-column {
    min-height: 0;
  }
  .card-title {
    margin: 0;
    border-bottom: 1px solid var(--card-border-color);
    padding-bottom: 0.75rem;
    margin-bottom: -0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .settings-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    align-items: flex-end;
  }
  .settings-form .button-group {
    /* This allows the button to align nicely with the inputs */
    padding-bottom: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: bold;
    font-size: 0.9em;
  }

  input {
    padding: 0.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
    width: 100%;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .button-group.spaced {
    justify-content: space-between;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 5px;
    background-color: var(--card-border-color);
    color: var(--text-color);
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  button.primary {
    background-color: var(--accent-color);
    color: white;
  }
  button.danger {
    background-color: #dc3545;
    color: white;
  }
  button.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8em;
  }
  button.reboot {
    background-color: #ffc107;
    color: black;
  }
  .mesh-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-grow: 1;
    overflow-y: auto;
  }

  .mesh-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 5px;
    background-color: var(--background-color);
    border: 1px solid transparent;
    transition: all 0.2s;
  }
  .mesh-item.active {
    border-color: var(--accent-color);
    background-color: var(--card-background-color);
  }

  .active-label {
    background-color: #28a745;
    color: white;
    font-size: 0.7em;
    font-weight: bold;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    margin-left: 0.5rem;
    text-transform: uppercase;
  }

  .slot-name {
    display: flex;
    align-items: center;
  }

  @media (max-width: 900px) {
    .page-container {
      grid-template-columns: 1fr;
    }
  }
</style>
