<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import { faShieldHalved, faLock } from "@fortawesome/free-solid-svg-icons"
  import Fa from "svelte-fa"
  import "./system-tools.css"
  import { toast } from "svelte-sonner"

  let newPassword = ""
  let confirmPassword = ""
  let passwordsMatch = false
  let showMismatch = false

  $: passwordsMatch = newPassword === confirmPassword && newPassword !== ""
  $: showMismatch =
    newPassword !== "" &&
    confirmPassword !== "" &&
    newPassword !== confirmPassword

  async function handlePasswordChange() {
    if (passwordsMatch) {
      try {
        const response = await fetch("/api/security/password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: newPassword }),
        })

        const data = await response.json()

        if (response.ok && data.status === "success") {
          toast.success("Root password changed successfully")
          newPassword = ""
          confirmPassword = ""
        } else {
          toast.error(data.message || "Failed to change root password")
        }
      } catch (error) {
        console.error("Error changing password:", error)
        toast.error("Failed to change root password")
      }
    }
  }
</script>

<Card>
  <svelte:fragment slot="title">
    <h3 class="card-title"><Fa icon={faShieldHalved} /> Security</h3>
  </svelte:fragment>
  <div class="tool-section">
    <form class="password-form" on:submit|preventDefault={handlePasswordChange}>
      <input
        type="password"
        placeholder="Root Password"
        bind:value={newPassword}
        class:error={showMismatch}
      />
      <input
        type="password"
        placeholder="Confirm"
        bind:value={confirmPassword}
        class:error={showMismatch}
      />
      <button type="submit" class="primary" disabled={!passwordsMatch}
        ><Fa icon={faLock} /> Change</button
      >
    </form>
  </div>
</Card>

<style>
  /* Styles imported from system-tools.css */

  .password-form {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
    align-items: center;
  }

  input {
    padding: 0.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: 5px;
    background-color: var(--background-color);
    color: var(--text-color);
    width: 100%;
  }

  input.error {
    border-color: #dc3545;
    background-color: rgba(220, 53, 69, 0.1);
  }
</style>
