import { marked } from "marked"
import docsMarkdown from "../../../../DOCS.md?raw"

export const prerender = true

// Helper function to generate slug from heading text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Custom renderer to ensure heading IDs are generated
const renderer = new marked.Renderer()
const originalHeading = renderer.heading.bind(renderer)
renderer.heading = function (args) {
  const { text, depth } = args
  const id = slugify(text)
  return `<h${depth} id="${id}">${text}</h${depth}>\n`
}

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
})

interface TocItem {
  text: string
  id: string
}

export function load() {
  const lines = docsMarkdown.split("\n")

  // Extract title (first h1)
  let title = ""
  let titleEndIndex = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      title = lines[i].substring(2)
      titleEndIndex = i + 1
      break
    }
  }

  // Find ToC section
  let tocStartIndex = -1
  let tocEndIndex = -1
  for (let i = titleEndIndex; i < lines.length; i++) {
    if (lines[i].startsWith("## Table of Contents")) {
      tocStartIndex = i
    } else if (tocStartIndex !== -1 && lines[i].startsWith("---")) {
      tocEndIndex = i
      break
    }
  }

  // Extract ToC items
  const tocItems: TocItem[] = []
  if (tocStartIndex !== -1 && tocEndIndex !== -1) {
    for (let i = tocStartIndex + 1; i < tocEndIndex; i++) {
      const line = lines[i].trim()
      const match = line.match(/^- \[(.+?)\]\(#(.+?)\)$/)
      if (match) {
        tocItems.push({
          text: match[1],
          id: match[2],
        })
      }
    }
  }

  // Build content markdown (skip title and ToC section)
  let contentMarkdown = ""
  if (tocEndIndex !== -1) {
    contentMarkdown = lines.slice(tocEndIndex + 1).join("\n")
  } else {
    contentMarkdown = lines.slice(titleEndIndex).join("\n")
  }

  const contentHtml = marked(contentMarkdown)

  return {
    title,
    tocItems,
    contentHtml,
  }
}
