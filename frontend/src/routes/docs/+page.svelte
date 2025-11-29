<script lang="ts">
  import Card from "$lib/components/Card.svelte"
  import type { PageData } from "./$types"
  import { onMount } from "svelte"

  export let data: PageData

  let contentContainer: HTMLElement
  let activeSection = data.tocItems[0]?.id || ""

  onMount(() => {
    // Handle ToC link clicks to scroll within the content container
    const tocLinks = document.querySelectorAll(".toc nav a")
    tocLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const href = link.getAttribute("href")
        if (href && href.startsWith("#")) {
          const targetId = href.substring(1)
          // Update active section immediately on click
          activeSection = targetId
          const targetElement = document.getElementById(targetId)
          if (targetElement && contentContainer) {
            // Scroll the content container to the target element
            const containerRect = contentContainer.getBoundingClientRect()
            const targetRect = targetElement.getBoundingClientRect()
            const scrollTop =
              contentContainer.scrollTop +
              targetRect.top -
              containerRect.top -
              20
            contentContainer.scrollTo({
              top: scrollTop,
              behavior: "smooth",
            })
          }
        }
      })
    })

    // Set up Intersection Observer to track active section
    const headings = contentContainer.querySelectorAll("h2[id]")
    const observerOptions = {
      root: contentContainer,
      rootMargin: "0px 0px -80% 0px",
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      // Find all intersecting headings
      const visibleHeadings = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top
        })

      // Set active to the topmost visible heading
      if (visibleHeadings.length > 0) {
        activeSection = visibleHeadings[0].target.id
      }
    }, observerOptions)

    headings.forEach((heading) => observer.observe(heading))

    return () => {
      observer.disconnect()
    }
  })
</script>

<div class="page-container">
  <Card>
    <svelte:fragment slot="title">
      <h1>{data.title}</h1>
    </svelte:fragment>
    <div class="docs-layout">
      <aside class="toc">
        <h2>Table of Contents</h2>
        <nav>
          <ul>
            {#each data.tocItems as item}
              <li>
                <a href="#{item.id}" class:active={activeSection === item.id}>
                  {item.text}
                </a>
              </li>
            {/each}
          </ul>
        </nav>
      </aside>
      <div class="docs-content" bind:this={contentContainer}>
        {@html data.contentHtml}
      </div>
    </div>
  </Card>
</div>

<style>
  .page-container {
    padding: 1rem;
    height: 100%;
    overflow: hidden;
  }

  .docs-layout {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
    height: 100%;
    overflow: hidden;
  }

  .toc {
    position: sticky;
    top: 0;
    height: fit-content;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
    padding-right: 1rem;
    border-right: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  }

  .toc h2 {
    font-size: 1.125rem;
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    color: var(--text-color);
  }

  .toc nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc nav li {
    margin-bottom: 0.5rem;
  }

  .toc nav a {
    color: var(--text-color);
    text-decoration: none;
    display: block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .toc nav a:hover {
    background-color: var(--hover-background, #f6f8fa);
  }

  .toc nav a.active {
    font-weight: 600;
    color: var(--link-color, #0366d6);
    border-left: 3px solid var(--link-color, #0366d6);
    padding-left: calc(0.5rem - 3px);
  }

  .docs-content {
    padding: 0 1rem;
    overflow-y: auto;
    max-height: calc(100vh - 8rem);
    line-height: 1.6;
  }

  /* Typography */
  .docs-content :global(h1) {
    font-size: 2.5rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: var(--text-color);
    border-bottom: 2px solid var(--border-color, #e1e4e8);
    padding-bottom: 0.5rem;
  }

  .docs-content :global(h2) {
    font-size: 1.5rem;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color, #e1e4e8);
    padding-bottom: 0.3rem;
  }

  .docs-content :global(h2:first-child) {
    margin-top: 0.5rem;
  }

  .docs-content :global(h3) {
    font-size: 1.25rem;
    margin-top: 2rem;
    margin-bottom: 0.8rem;
    color: var(--text-color);
  }

  .docs-content :global(h4) {
    font-size: 1.1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.6rem;
    color: var(--text-color);
  }

  .docs-content :global(p) {
    margin-bottom: 1rem;
    color: var(--text-color);
  }

  /* Links */
  .docs-content :global(a) {
    color: var(--link-color, #0366d6);
    text-decoration: none;
  }

  .docs-content :global(a:hover) {
    text-decoration: underline;
  }

  /* Lists */
  .docs-content :global(ul),
  .docs-content :global(ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
  }

  .docs-content :global(li) {
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }

  .docs-content :global(ul ul),
  .docs-content :global(ol ul),
  .docs-content :global(ul ol),
  .docs-content :global(ol ol) {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* Code blocks */
  .docs-content :global(pre) {
    background-color: var(--code-background, #f6f8fa);
    border: 1px solid var(--border-color, #e1e4e8);
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .docs-content :global(code) {
    font-family: "Consolas", "Monaco", "Courier New", monospace;
    font-size: 0.9em;
    background-color: var(--code-background, #f6f8fa);
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }

  .docs-content :global(pre code) {
    background-color: transparent;
    padding: 0;
    font-size: 0.875rem;
  }

  /* Blockquotes */
  .docs-content :global(blockquote) {
    border-left: 4px solid var(--border-color, #dfe2e5);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-secondary, #6a737d);
    font-style: italic;
  }

  .docs-content :global(blockquote p) {
    margin-bottom: 0.5rem;
  }

  /* Tables */
  .docs-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    overflow-x: auto;
    display: block;
  }

  .docs-content :global(thead) {
    background-color: var(--table-header-bg, #f6f8fa);
  }

  .docs-content :global(th) {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    border: 1px solid var(--border-color, #e1e4e8);
    color: var(--text-color);
  }

  .docs-content :global(td) {
    padding: 0.75rem;
    border: 1px solid var(--border-color, #e1e4e8);
    color: var(--text-color);
  }

  .docs-content :global(tr:nth-child(even)) {
    background-color: var(--table-row-bg, #f6f8fa);
  }

  /* Horizontal rules */
  .docs-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    margin: 2rem 0;
  }

  /* Images */
  .docs-content :global(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1rem 0;
  }

  /* Strong and emphasis */
  .docs-content :global(strong) {
    font-weight: 600;
    color: var(--text-color);
  }

  .docs-content :global(em) {
    font-style: italic;
  }

  /* Dark mode support */
  :global([data-theme="dark"]) .docs-content :global(pre),
  :global([data-theme="dark"]) .docs-content :global(code) {
    background-color: #1e1e1e;
    color: #d4d4d4;
  }

  :global([data-theme="dark"]) .docs-content :global(a) {
    color: #58a6ff;
  }

  :global([data-theme="dark"]) .docs-content :global(th),
  :global([data-theme="dark"]) .docs-content :global(td) {
    border-color: #30363d;
  }

  :global([data-theme="dark"]) .docs-content :global(thead) {
    background-color: #161b22;
  }

  :global([data-theme="dark"]) .docs-content :global(tr:nth-child(even)) {
    background-color: #0d1117;
  }

  :global([data-theme="dark"]) .docs-content :global(blockquote) {
    border-left-color: #30363d;
    color: #8b949e;
  }

  :global([data-theme="dark"]) .toc {
    border-right-color: rgba(255, 255, 255, 0.1);
  }

  :global([data-theme="dark"]) .toc nav a:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :global([data-theme="dark"]) .toc nav a.active {
    color: #58a6ff;
    border-left-color: #58a6ff;
  }

  :global([data-theme="dark"]) .docs-content :global(hr) {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  :global([data-theme="dark"]) .docs-content :global(h1),
  :global([data-theme="dark"]) .docs-content :global(h2) {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .docs-content {
      padding: 1rem;
    }

    .docs-content :global(h1) {
      font-size: 2rem;
    }

    .docs-content :global(h2) {
      font-size: 1.5rem;
    }

    .docs-content :global(h3) {
      font-size: 1.25rem;
    }

    .docs-content :global(table) {
      font-size: 0.875rem;
    }

    .docs-content :global(th),
    .docs-content :global(td) {
      padding: 0.5rem;
    }
  }
</style>
