<script lang="ts">
  import InfoModal from "$lib/components/InfoModal.svelte"
  import { systemInfo } from "$lib/stores/system"
  import { logStore } from "$lib/stores/log"
  import SystemCard from "$lib/components/system-tools/SystemCard.svelte"
  import ServicesCard from "$lib/components/system-tools/ServicesCard.svelte"
  import SecurityCard from "$lib/components/system-tools/SecurityCard.svelte"
  import PrinterLogCard from "$lib/components/system-tools/PrinterLogCard.svelte"
  import FileBrowserCard from "$lib/components/system-tools/FileBrowserCard.svelte"
  import { toast } from "svelte-sonner"

  let isModalOpen = false
  let modalTitle = ""
  let modalMessage = ""
  let modalButtons: { label: string; class?: string; event: string }[] = []
  let modalAction: "reboot" | "poweroff" | "clearLog" | null = null

  function showConfirmationModal(action: "reboot" | "poweroff" | "clearLog") {
    modalAction = action
    modalTitle = "Confirm Action"
    if (action === "clearLog") {
      modalMessage = "Are you sure you want to clear the printer log?"
      modalButtons = [
        { label: "Cancel", event: "close" },
        { label: "Yes, Clear Log", class: "danger", event: "confirm" },
      ]
    } else {
      modalTitle = `Confirm ${action}`
      modalMessage = `Are you sure you want to ${action} the printer?`
      modalButtons = [
        { label: "Cancel", event: "close" },
        { label: `Yes, ${action}`, class: "danger", event: "confirm" },
      ]
    }
    isModalOpen = true
  }

  async function handleModalConfirm() {
    if (!modalAction) return

    isModalOpen = false
    if (modalAction === "reboot" || modalAction === "poweroff") {
      await handleSystemAction(modalAction)
    } else if (modalAction === "clearLog") {
      try {
        await logStore.clearLog()
        toast.success("Printer log cleared successfully")
      } catch (error) {
        toast.error("Failed to clear printer log")
      }
    }
    modalAction = null
  }

  async function handleSystemAction(
    action: "reboot" | "poweroff" | "ssh_start" | "ssh_stop" | "ssh_restart",
  ) {
    try {
      let response: Response

      // Map actions to new API endpoints
      if (action === "reboot") {
        response = await fetch("/api/system/reboot", { method: "POST" })
      } else if (action === "poweroff") {
        response = await fetch("/api/system/poweroff", { method: "POST" })
      } else if (action === "ssh_start") {
        response = await fetch("/api/system/ssh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        })
      } else if (action === "ssh_stop") {
        response = await fetch("/api/system/ssh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        })
      } else if (action === "ssh_restart") {
        response = await fetch("/api/system/ssh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restart" }),
        })
      } else {
        throw new Error("Unknown action")
      }

      if (response.ok) {
        const actionMessages: Record<typeof action, string> = {
          reboot: "Printer is rebooting...",
          poweroff: "Printer is shutting down...",
          ssh_start: "SSH service started",
          ssh_stop: "SSH service stopped",
          ssh_restart: "SSH service restarted",
        }
        toast.success(actionMessages[action])
        setTimeout(() => {
          systemInfo.forceUpdate()
        }, 1000)
      } else {
        throw new Error("Action failed")
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error)
      toast.error(`Failed to ${action.replace("_", " ")}`)
    }
  }
</script>

<InfoModal
  isOpen={isModalOpen}
  title={modalTitle}
  message={modalMessage}
  buttons={modalButtons}
  on:close={() => (isModalOpen = false)}
  on:confirm={handleModalConfirm}
/>

<div class="page-container">
  <div class="top-cards">
    <SystemCard onShowConfirmationModal={showConfirmationModal} />
    <ServicesCard onHandleSystemAction={handleSystemAction} />
    <SecurityCard />
  </div>

  <div class="bottom-cards">
    <PrinterLogCard onShowConfirmationModal={showConfirmationModal} />
    <FileBrowserCard />
  </div>
</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    height: 100%;
    width: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .top-cards,
  .bottom-cards {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .bottom-cards {
    flex-grow: 1;
    min-height: 0;
  }

  .top-cards > :global(.card) {
    flex-grow: 1;
    min-width: 0;
  }

  .bottom-cards > :global(.card) {
    flex: 0 0 calc(50% - 0.5rem);
    min-width: 0;
    max-width: calc(50% - 0.5rem);
    width: calc(50% - 0.5rem);
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
  }
</style>
