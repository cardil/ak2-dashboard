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
    faPencilAlt,
  } from "@fortawesome/free-solid-svg-icons"
  import { get, type Unsubscriber } from "svelte/store"
  import { onDestroy } from "svelte"
  import { levelingStore } from "$lib/stores/leveling"
  import { profilesStore } from "$lib/stores/profiles"
  import type { Slot } from "$lib/stores/leveling"
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

  // z-offset inline editing state
  let editingZOffsetSlotId: number | "active" | null = null
  let editingZOffsetValue = ""

  function focusOnMount(node: HTMLElement) {
    node.focus()
  }

  $: if ($levelingStore.activeSlot) {
    const activeDataString = JSON.stringify($levelingStore.activeSlot.data)
    const foundSlot = $levelingStore.savedSlots.find(
      (s) => JSON.stringify(s.data) === activeDataString,
    )
    if (foundSlot) {
      activeSlotId = foundSlot.id
    } else {
      const averageSlot = $levelingStore.averageSlot
      if (
        averageSlot &&
        JSON.stringify(averageSlot.data) === activeDataString
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
  const unsubLeveling: Unsubscriber = levelingStore.subscribe((store) => {
    if (store.settings && !store.isUpdating) {
      localSettings = { ...store.settings }
    }
    // Initialize visualized data with the active slot from the store
    if (store.activeSlot && visualizedSlotId === null) {
      visualizedMeshData = store.activeSlot.data
      visualizedSlotId = "active"
    }
  })
  onDestroy(unsubLeveling)

  // Reactive block to handle cases where the visualized slot is deleted from the store
  $: if (
    $levelingStore.activeSlot &&
    visualizedSlotId &&
    visualizedSlotId !== "active" &&
    visualizedSlotId !== "average" &&
    !$levelingStore.savedSlots.find((s) => s.id === visualizedSlotId)
  ) {
    visualizeSlot($levelingStore.activeSlot)
  }

  // Ensure the visualizer updates when the active slot data changes
  $: if (visualizedSlotId === "active" && $levelingStore.activeSlot) {
    visualizedMeshData = $levelingStore.activeSlot.data
  }

  // Ensure the visualizer updates when the average slot data changes
  $: if (visualizedSlotId === "average" && $levelingStore.averageSlot) {
    visualizedMeshData = $levelingStore.averageSlot.data
  }

  // --- UI Functions ---

  function enterEditMode() {
    editedMeshData = JSON.parse(JSON.stringify(visualizedMeshData))
    visualizedSlotId = null
    isEditing = true
  }

  function visualizeSlot(slot: Slot) {
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

  function activateSlot(slotToActivate: Slot) {
    if (typeof slotToActivate.id === "number") {
      levelingStore.activateSlot(slotToActivate.id)
    } else if (slotToActivate.id === "average") {
      levelingStore.activateAverageMesh()
    }
  }

  async function handleSaveSettings() {
    if (!$levelingStore.settings) return

    if (
      $profilesStore.selectedProfile === "current" &&
      localSettings.gridSize !== $levelingStore.settings.gridSize
    ) {
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
      if (
        response.grid_size_changed &&
        $profilesStore.selectedProfile === "current"
      ) {
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

  async function handleReboot() {
    try {
      const response = await fetch("/api/system/reboot", { method: "POST" })
      if (response.ok) {
        toast.success("Printer is rebooting...")
        modalState = "closed"
      } else {
        throw new Error("Reboot request failed")
      }
    } catch (error) {
      console.error("Error during reboot:", error)
      toast.error("Failed to reboot printer")
    }
  }

  async function handleSaveMesh(event: CustomEvent<{ slot: number }>) {
    const slotId = event.detail.slot
    isSaveModalOpen = false

    try {
      if (isEditing) {
        await levelingStore.saveEditedMesh(slotId, editedMeshData)
        isEditing = false
        toast.success(`Mesh saved to slot ${slotId}`)
        const savedSlot = get(levelingStore).savedSlots.find(
          (s) => s.id === slotId,
        )
        if (savedSlot) {
          visualizeSlot(savedSlot)
        }
      } else {
        await levelingStore.saveActiveMesh(slotId)
        toast.success(`Active mesh saved to slot ${slotId}`)
        const savedSlot = get(levelingStore).savedSlots.find(
          (s) => s.id === slotId,
        )
        if (savedSlot) {
          visualizeSlot(savedSlot)
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
        modalInfo = {
          title: "Reboot Required",
          message:
            "Profile has been applied to the printer.\n\nA printer reboot is required for the changes to take full effect.",
          buttons: [
            { label: "Later", event: "close", class: "" },
            { label: "Reboot Printer", event: "reboot", class: "reboot" },
          ],
        }
        modalState = "reboot_needed"
        toast.success("Profile applied to printer. Reboot required.")
      } else if (target === "new") {
        toast.success(`Profile "${name}" created successfully`)
      } else {
        toast.success("Profile saved successfully")
      }

      await levelingStore.fetchData()
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile")
    }
  }

  // --- z-offset inline editing ---

  function startEditZOffset(slotId: number | "active", currentValue?: number) {
    editingZOffsetSlotId = slotId
    editingZOffsetValue = currentValue !== undefined ? String(currentValue) : ""
  }

  async function commitZOffset() {
    if (editingZOffsetSlotId === null) return
    const parsed = parseFloat(editingZOffsetValue)
    if (!isNaN(parsed)) {
      try {
        await levelingStore.updateZOffset(editingZOffsetSlotId, parsed)
        toast.success("Z-offset updated")
      } catch {
        toast.error("Failed to update z-offset")
      }
    }
    editingZOffsetSlotId = null
    editingZOffsetValue = ""
  }

  function cancelEditZOffset() {
    editingZOffsetSlotId = null
    editingZOffsetValue = ""
  }

  function formatZOffset(zOffset?: number, precision?: number): string {
    if (zOffset === undefined) return "z: —"
    // Number of decimal places to round to (derived from precision step)
    // e.g. 0.01 → 2, 0.005 → 3, 0.001 → 3
    const decimals =
      precision !== undefined && precision > 0
        ? Math.max(0, -Math.floor(Math.log10(precision)))
        : 4
    // Round to nearest precision step
    const rounded =
      precision !== undefined && precision > 0
        ? Math.round(zOffset / precision) * precision
        : zOffset
    // toFixed for rounding, then parseFloat strips trailing zeros
    return `z: ${parseFloat(rounded.toFixed(decimals))}mm`
  }

  // Reactive label for mesh based on selection
  $: meshLabel =
    $profilesStore.selectedProfile === "current"
      ? "Active Mesh"
      : "Profile Mesh"

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
      <Card style="flex-shrink: 0;">
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
            {#if $levelingStore.activeSlot}
              <div
                class="mesh-item"
                class:active={visualizedSlotId === "active"}
              >
                <span>{meshLabel}</span>
                <!-- z-offset display / inline edit for active slot -->
                {#if editingZOffsetSlotId === "active"}
                  <input
                    class="zoffset-input"
                    type="number"
                    step="0.0001"
                    bind:value={editingZOffsetValue}
                    on:keydown={(e) => {
                      if (e.key === "Enter") commitZOffset()
                      if (e.key === "Escape") cancelEditZOffset()
                    }}
                    on:blur={commitZOffset}
                    use:focusOnMount
                  />
                {:else}
                  <button
                    class="zoffset-label"
                    title="Click to edit z-offset"
                    on:click={() =>
                      startEditZOffset(
                        "active",
                        $levelingStore.activeSlot?.zOffset,
                      )}
                  >
                    {formatZOffset(
                      $levelingStore.activeSlot.zOffset,
                      $levelingStore.settings?.precision,
                    )}
                    <FontAwesomeIcon icon={faPencilAlt} class="edit-icon" />
                  </button>
                {/if}
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
                      $levelingStore.activeSlot &&
                      visualizeSlot($levelingStore.activeSlot)}
                    disabled={visualizedSlotId === "active"}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Visualize
                  </button>
                </div>
              </div>
            {/if}

            <!-- Average Mesh Special Slot -->
            {#if $levelingStore.averageSlot}
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
                <!-- Average z-offset is read-only -->
                <span class="zoffset-label readonly">
                  {formatZOffset(
                    $levelingStore.averageSlot.zOffset,
                    $levelingStore.settings?.precision,
                  )}
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
                      $levelingStore.averageSlot &&
                      visualizeSlot($levelingStore.averageSlot)}
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
          <div class="card-title-row">
            <h3 class="card-title">
              <FontAwesomeIcon icon={faHdd} /> Saved Bed Meshes
            </h3>
            {#if $levelingStore.savedSlots.length > 0}
              <button
                class="header-danger-btn"
                title="Delete all saved meshes"
                aria-label="Delete all saved meshes"
                type="button"
                on:click={deleteAllSlots}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            {/if}
          </div>
        </svelte:fragment>
        <div class="mesh-list">
          {#each $levelingStore.savedSlots as slot (slot.id)}
            <div class="mesh-item" class:active={slot.id === visualizedSlotId}>
              <span class="slot-name">
                {slot.name}
                {#if slot.id === activeSlotId}
                  <span class="active-label">active</span>
                {/if}
              </span>
              <!-- z-offset inline edit for saved slots -->
              {#if editingZOffsetSlotId === slot.id}
                <input
                  class="zoffset-input"
                  type="number"
                  step="0.0001"
                  bind:value={editingZOffsetValue}
                  on:keydown={(e) => {
                    if (e.key === "Enter") commitZOffset()
                    if (e.key === "Escape") cancelEditZOffset()
                  }}
                  on:blur={commitZOffset}
                  use:focusOnMount
                />
              {:else}
                <button
                  class="zoffset-label"
                  title="Click to edit z-offset"
                  on:click={() =>
                    typeof slot.id === "number" &&
                    startEditZOffset(slot.id, slot.zOffset)}
                >
                  {formatZOffset(
                    slot.zOffset,
                    $levelingStore.settings?.precision,
                  )}
                  <FontAwesomeIcon icon={faPencilAlt} class="edit-icon" />
                </button>
              {/if}
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
    grid-template-columns: minmax(260px, 35%) 1fr;
    gap: 0.5rem;
    padding: 0.5rem;
    height: 100%;
    overflow: hidden;
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
    gap: 0.5rem;
    min-height: 0;
    overflow: hidden;
  }

  .column-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
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

  .card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .header-danger-btn {
    padding: 0.15rem 0.35rem;
    border: none;
    border-radius: 4px;
    background: none;
    color: #dc3545;
    cursor: pointer;
    opacity: 0.7;
    font-size: 0.85em;
    display: flex;
    align-items: center;
    transition: opacity 0.15s;
  }
  .header-danger-btn:hover {
    opacity: 1;
    background-color: rgba(220, 53, 69, 0.1);
  }

  .settings-form {
    display: grid;
    grid-template-columns: repeat(3, 1fr) auto;
    gap: 0.5rem;
    align-items: flex-end;
  }
  .settings-form .button-group {
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
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    padding: 0.5rem;
    border-radius: 5px;
    background-color: var(--background-color);
    border: 1px solid transparent;
    transition: all 0.2s;
    column-gap: 0.5rem;
    row-gap: 0.15rem;
  }
  .mesh-item.active {
    border-color: var(--accent-color);
    background-color: var(--card-background-color);
  }
  .mesh-item .button-group {
    grid-column: 2;
    grid-row: 1 / span 2;
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

  .zoffset-label {
    font-size: 0.75em;
    color: var(--text-muted-color, #888);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-weight: normal;
    text-align: left;
    justify-self: start;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .zoffset-label.readonly {
    cursor: default;
  }
  .zoffset-label :global(.edit-icon) {
    opacity: 0.4;
    font-size: 0.85em;
  }
  .zoffset-label:hover :global(.edit-icon) {
    opacity: 1;
  }

  .zoffset-input {
    width: 8rem;
    font-size: 0.8em;
    padding: 0.15rem 0.3rem;
    justify-self: start;
  }

  @media (max-width: 900px) {
    .page-container {
      grid-template-columns: 1fr;
      overflow-y: auto;
      height: auto;
    }
  }
</style>
