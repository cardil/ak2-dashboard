# Frontend Development Guide

Modern Svelte-based frontend for the AK2 Dashboard.

## Overview

The frontend is a reactive single-page application built with Svelte and SvelteKit. It provides a modern, responsive interface for printer control, bed mesh leveling, system tools, and file management.

### Technology Stack

- **[Svelte](https://svelte.dev/)** - Reactive UI framework
- **[SvelteKit](https://kit.svelte.dev/)** - Application framework with routing
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[ECharts](https://echarts.apache.org/)** - 3D bed mesh visualization
- **[Prism.js](https://prismjs.com/)** - Syntax highlighting for code viewer

## Development Setup

### Prerequisites

- Node.js 20+ and npm
- Modern web browser

### Installation

```bash
cd frontend
npm install
```

### Development Server

Start the dev server with hot module reloading:

```bash
npm run dev
```

Open browser at `http://localhost:5173`

The dev server includes:

- **Hot Module Replacement** - Instant updates without page reload
- **Mock API Server** - Simulates printer API for testing
- **Source Maps** - Debug TypeScript directly in browser
- **Fast Refresh** - Preserves component state during edits

## Building for Production

### Build Commands

**Production Build:**

```bash
npm run build
```

Outputs to `build/` directory as a static site.

**Preview Production Build:**

```bash
npm run preview
```

**Full Build from Project Root:**

```bash
make
```

Builds frontend and packages into `webserver/` for deployment.

## Architecture

### Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   │   ├── icons/      # SVG icon components
│   │   │   └── system-tools/ # System tools page components
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── api/            # API client modules
│   │   ├── utils/          # Utility functions
│   │   └── dev/            # Development mock servers
│   ├── routes/             # SvelteKit routes (pages)
│   │   ├── +layout.svelte  # Root layout
│   │   ├── +page.svelte    # Dashboard (home)
│   │   ├── leveling/       # Bed mesh leveling page
│   │   ├── system-tools/   # System tools page
│   │   └── about/          # About page
│   └── app.html            # HTML template
├── static/                 # Static assets
└── test/                   # Test files
```

### Component Design

Components follow Svelte best practices:

- **Single Responsibility** - Each component has one clear purpose
- **Props for Input** - Configuration via props, not global state
- **Events for Output** - Parent components handle actions via events
- **Stores for Shared State** - Use stores for cross-component data

Example component structure:

```svelte
<script lang="ts">
  import { someStore } from "$lib/stores/someStore"

  export let prop1: string
  export let prop2: number = 0

  function handleAction() {
    // Handle user interaction
  }
</script>

<div class="component">
  <!-- Template -->
</div>

<style>
  /* Component-scoped styles */
</style>
```

## State Management

The application uses Svelte stores for reactive state management:

### Core Stores

- **`printer.ts`** - Printer data, Socket.IO connection to Kobra Unleashed
- **`activePrinterId.ts`** - Currently selected printer
- **`kobraConnection.ts`** - Connection status to Kobra Unleashed
- **`leveling.ts`** - Bed mesh leveling data and operations
- **`system.ts`** - System information (CPU, memory, uptime)
- **`log.ts`** - Printer log viewer with follow mode
- **`fileBrowser.ts`** - File browser navigation state
- **`webserver.ts`** - Webserver configuration
- **`theme.ts`** - Light/dark theme preference
- **`time.ts`** - Current time updates

### Using Stores

```typescript
import { printerStore } from "$lib/stores/printer"
import { get } from "svelte/store"

// Subscribe to changes (reactive)
$: printers = $printerStore

// Get current value (non-reactive)
const currentPrinters = get(printerStore)

// Call store methods
printerStore.startPrint(printerId, filename)
```

## Mock Server Usage

The mock server enables frontend development without a physical printer:

### Automatic Mock Mode

Development server automatically uses mocks when no `api_url` parameter is present:

```bash
npm run dev
# Opens at http://localhost:5173 with mock data
```

### Testing with Real Backend

Connect to actual printer backend during development:

```bash
npm run dev
# Then navigate to: http://localhost:5173?api_url=http://192.168.1.100
```

### Mock Data Location

Mock implementations are in `src/lib/dev/`:

- `mockProxy.ts` - Proxies local commands to mock server
- `mockLocalCommands.ts` - Local command implementations
- `test/mocks/` - Mock API responses and data generators

### Creating New Mocks

When adding new API endpoints, update the mock server:

1. Add mock response in `test/mocks/mockApi.ts`
2. Update `test/mocks/kobraUnleashedMock.ts` for Socket.IO events
3. Test in dev mode before deploying

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Smoke tests (spins up its own dev server)
npm run test:smoke

# Watch mode
npm run test:watch
```

### Test Structure

- **Unit Tests** - `test/components/` for component testing
- **Smoke Tests** - `test/smoke/` for integration testing
- **Mocks** - `test/mocks/` for test data

### Writing Tests

Example component test:

```typescript
import { render } from "@testing-library/svelte"
import { expect, test } from "vitest"
import MyComponent from "$lib/components/MyComponent.svelte"

test("renders correctly", () => {
  const { getByText } = render(MyComponent, {
    props: { title: "Test Title" },
  })
  expect(getByText("Test Title")).toBeTruthy()
})
```

## Adding New Features

### Adding a New Page

1. **Create Route:**

   ```bash
   mkdir src/routes/newpage
   touch src/routes/newpage/+page.svelte
   ```

2. **Implement Page Component:**

   ```svelte
   <script lang="ts">
     import Card from "$lib/components/Card.svelte"
   </script>

   <div class="page">
     <h1>New Page</h1>
     <Card>
       <!-- Content -->
     </Card>
   </div>
   ```

3. **Add Navigation Link** in `src/lib/components/NavMenu.svelte`

4. **Add Icon** (if needed) in `src/lib/components/icons/`

### Adding a New Component

1. Create component file in `src/lib/components/`
2. Define props with TypeScript types
3. Use existing components (Card, Spinner) for consistency
4. Add component-scoped styles
5. Export from `src/lib/index.ts` if reusable

### Adding a New Store

1. Create store file in `src/lib/stores/`
2. Use `writable`, `derived`, or `readable` from 'svelte/store'
3. Implement methods for common operations
4. Export store instance
5. Add to mocks if needed for testing

### Adding API Integration

1. Define types in component or store
2. Create API client function in `src/lib/api/`
3. Handle errors with try-catch
4. Update mock server for development
5. Test with both mock and real backend

## Code Style

- **Formatting** - Prettier (`.prettierrc.json`)
- **Linting** - ESLint with TypeScript rules
- **TypeScript** - Strict mode enabled
- **Import Organization** - `$lib/` alias for imports

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Performance Considerations

- **Code Splitting** - SvelteKit automatically splits routes
- **Lazy Loading** - Heavy components loaded on demand
- **Store Optimization** - Stores only update when values change
- **Build Size** - Monitor with `npm run build --verbose`

Current bundle size: ~140KB (gzipped)

## Troubleshooting

### Dev Server Won't Start

- Clear `.svelte-kit` directory: `rm -rf .svelte-kit`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Mock Data Not Loading

- Ensure no `api_url` parameter in URL
- Check browser console for errors
- Verify mock files in `test/mocks/`

### Build Failures

- Run `npm run check` to find TypeScript errors
- Check for missing imports or type errors
- Ensure all routes have valid `+page.svelte` files

---

For backend development, see [../src/README.md](../src/README.md).
