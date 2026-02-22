<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte"
  import { effectiveTheme } from "$lib/stores/theme"
  import Prism from "prismjs"
  import "prismjs/components/prism-python"
  import "prismjs/components/prism-bash"
  import "prismjs/components/prism-json"
  import "prismjs/components/prism-yaml"
  import "prismjs/components/prism-ini"
  import "prismjs/components/prism-markup"
  import "prismjs/components/prism-c"
  import "prismjs/components/prism-cpp"
  import "prismjs/components/prism-javascript"
  import "prismjs/components/prism-css"
  import "prismjs/components/prism-gcode"

  export let isOpen = false
  export let title = ""
  export let content = ""
  export let language = "text"
  export let readonly = true
  export let isBinary = false

  const dispatch = createEventDispatcher()
  let contentElement: HTMLElement

  $: if (isOpen && language && contentElement) {
    requestAnimationFrame(() => {
      Prism.highlightAllUnder(contentElement)
    })
  }

  function detectLanguage(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      py: "python",
      sh: "bash",
      bash: "bash",
      json: "json",
      yml: "yaml",
      yaml: "yaml",
      cfg: "ini",
      conf: "ini",
      ini: "ini",
      html: "markup",
      xml: "markup",
      svg: "markup",
      c: "c",
      h: "c",
      cpp: "cpp",
      cc: "cpp",
      cxx: "cpp",
      hpp: "cpp",
      js: "javascript",
      ts: "javascript",
      css: "css",
      gcode: "gcode",
      gco: "gcode",
      nc: "gcode",
      log: "text",
      txt: "text",
    }
    return langMap[ext || ""] || "text"
  }

  function handleClose() {
    dispatch("close")
  }

  function handleBackdropClick() {
    handleClose()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose()
    }
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleBackdropClick()
    }
  }

  export function setLanguageFromFilename(filename: string) {
    language = detectLanguage(filename)
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
    aria-label="Close editor"
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
      <div class="modal-header">
        <h3 id="modal-title">{title}</h3>
        <button class="close-button" on:click={handleClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      <div class="modal-content" bind:this={contentElement}>
        {#if isBinary}
          <pre class="hex-dump">{content}</pre>
        {:else if language && language !== "text"}
          <pre><code class="language-{language}">{content}</code></pre>
        {:else}
          <pre class="plain-text">{content}</pre>
        {/if}
      </div>
      <div class="modal-footer">
        <div class="footer-info">
          {#if readonly}
            <span class="readonly-badge">Read-only</span>
          {/if}
          {#if isBinary}
            <span class="binary-badge">Binary (Hex Dump)</span>
          {:else}
            <span class="language-badge">{language}</span>
          {/if}
        </div>
        <button class="primary" on:click={handleClose}>Close</button>
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
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .modal {
    background-color: var(--card-background-color);
    border-radius: 8px;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    width: 70vw;
    height: 80vh;
    max-width: 70vw;
    max-height: 80vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid var(--card-border-color);
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: calc(70vw - 5rem);
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5em;
    color: var(--text-color);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  :global(body[data-theme="dark"]) .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .modal-content {
    flex-grow: 1;
    overflow: auto;
    min-height: 0;
    padding: 0;
    margin: 0;
  }

  pre {
    margin: 0;
    padding: 1.5rem;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
  }

  pre.plain-text {
    font-family: "Fira Code", "Consolas", "Monaco", "Courier New", monospace;
    font-size: 1.1rem;
    line-height: 1.5;
    white-space: pre;
  }

  pre.hex-dump {
    font-family: "Fira Code", "Consolas", "Monaco", "Courier New", monospace;
    font-size: 1.1rem;
    line-height: 1.6;
    white-space: pre;
    color: var(--text-color);
  }

  code {
    font-family: "Fira Code", "Consolas", "Monaco", "Courier New", monospace;
    font-size: 1.1rem;
    line-height: 1.5;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 2px solid var(--card-border-color);
    gap: 1rem;
    flex-shrink: 0;
  }

  .footer-info {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .readonly-badge,
  .language-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
  }

  .readonly-badge {
    background-color: #ffc107;
    color: #000;
  }

  .language-badge {
    background-color: var(--card-border-color);
    color: var(--text-color);
  }

  .binary-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
    background-color: #6c757d;
    color: #fff;
  }

  button.primary {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 5px;
    background-color: var(--accent-color);
    color: white;
    font-weight: bold;
    cursor: pointer;
  }

  button.primary:hover {
    background-color: var(--accent-color-dark);
  }

  /* Custom scrollbar for code content */
  .modal-content::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: var(--card-background-color);
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: var(--card-border-color);
    border-radius: 6px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: var(--accent-color);
  }

  /* Prism.js custom theme - Light mode */
  :global(body[data-theme="light"])
    .modal-content
    :global(pre[class*="language-"]),
  :global(body[data-theme="light"])
    .modal-content
    :global(code[class*="language-"]) {
    background: #fafafa;
    color: #383a42;
    text-shadow: none;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.comment),
  :global(body[data-theme="light"]) .modal-content :global(.token.prolog),
  :global(body[data-theme="light"]) .modal-content :global(.token.doctype),
  :global(body[data-theme="light"]) .modal-content :global(.token.cdata) {
    color: #a0a1a7;
    font-style: italic;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.punctuation) {
    color: #383a42;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.property),
  :global(body[data-theme="light"]) .modal-content :global(.token.tag),
  :global(body[data-theme="light"]) .modal-content :global(.token.boolean),
  :global(body[data-theme="light"]) .modal-content :global(.token.number),
  :global(body[data-theme="light"]) .modal-content :global(.token.constant),
  :global(body[data-theme="light"]) .modal-content :global(.token.symbol),
  :global(body[data-theme="light"]) .modal-content :global(.token.deleted) {
    color: #e45649;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.selector),
  :global(body[data-theme="light"]) .modal-content :global(.token.attr-name),
  :global(body[data-theme="light"]) .modal-content :global(.token.string),
  :global(body[data-theme="light"]) .modal-content :global(.token.char),
  :global(body[data-theme="light"]) .modal-content :global(.token.builtin),
  :global(body[data-theme="light"]) .modal-content :global(.token.inserted) {
    color: #50a14f;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.operator),
  :global(body[data-theme="light"]) .modal-content :global(.token.entity),
  :global(body[data-theme="light"]) .modal-content :global(.token.url) {
    color: #383a42;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.atrule),
  :global(body[data-theme="light"]) .modal-content :global(.token.attr-value),
  :global(body[data-theme="light"]) .modal-content :global(.token.keyword) {
    color: #a626a4;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.function),
  :global(body[data-theme="light"]) .modal-content :global(.token.class-name) {
    color: #4078f2;
  }

  :global(body[data-theme="light"]) .modal-content :global(.token.regex),
  :global(body[data-theme="light"]) .modal-content :global(.token.important),
  :global(body[data-theme="light"]) .modal-content :global(.token.variable) {
    color: #986801;
  }

  /* Prism.js custom theme - Dark mode */
  :global(body[data-theme="dark"])
    .modal-content
    :global(pre[class*="language-"]),
  :global(body[data-theme="dark"])
    .modal-content
    :global(code[class*="language-"]) {
    background: #2d2d2d;
    color: #cccccc;
    text-shadow: none;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.comment),
  :global(body[data-theme="dark"]) .modal-content :global(.token.prolog),
  :global(body[data-theme="dark"]) .modal-content :global(.token.doctype),
  :global(body[data-theme="dark"]) .modal-content :global(.token.cdata) {
    color: #999999;
    font-style: italic;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.punctuation) {
    color: #cccccc;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.property),
  :global(body[data-theme="dark"]) .modal-content :global(.token.tag),
  :global(body[data-theme="dark"]) .modal-content :global(.token.boolean),
  :global(body[data-theme="dark"]) .modal-content :global(.token.number),
  :global(body[data-theme="dark"]) .modal-content :global(.token.constant),
  :global(body[data-theme="dark"]) .modal-content :global(.token.symbol),
  :global(body[data-theme="dark"]) .modal-content :global(.token.deleted) {
    color: #f2777a;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.selector),
  :global(body[data-theme="dark"]) .modal-content :global(.token.attr-name),
  :global(body[data-theme="dark"]) .modal-content :global(.token.string),
  :global(body[data-theme="dark"]) .modal-content :global(.token.char),
  :global(body[data-theme="dark"]) .modal-content :global(.token.builtin),
  :global(body[data-theme="dark"]) .modal-content :global(.token.inserted) {
    color: #99cc99;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.operator),
  :global(body[data-theme="dark"]) .modal-content :global(.token.entity),
  :global(body[data-theme="dark"]) .modal-content :global(.token.url) {
    color: #66cccc;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.atrule),
  :global(body[data-theme="dark"]) .modal-content :global(.token.attr-value),
  :global(body[data-theme="dark"]) .modal-content :global(.token.keyword) {
    color: #cc99cc;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.function),
  :global(body[data-theme="dark"]) .modal-content :global(.token.class-name) {
    color: #6699cc;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.regex),
  :global(body[data-theme="dark"]) .modal-content :global(.token.important),
  :global(body[data-theme="dark"]) .modal-content :global(.token.variable) {
    color: #f99157;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.bold) {
    font-weight: bold;
  }

  :global(body[data-theme="dark"]) .modal-content :global(.token.italic) {
    font-style: italic;
  }
</style>
