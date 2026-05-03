# @leadertechie/md2compose

**Generic markdown composition engine — stitch, slot, and hydrate markdown content with parent/child inheritance.**

`md2compose` is a content composition layer. It takes a markdown file, recursively walks its parent chain (declared in frontmatter), stitches content into slot placeholders, and hydrates asset URLs. It does NOT know about page layout, routing, or rendering — it is purely a content assembly engine.

---

## Installation

```bash
npm install @leadertechie/md2compose
```

---

## Quick Start

```typescript
import { Composer } from '@leadertechie/md2compose';

const composer = new Composer({
  loader: async (path) => {
    // Fetch content from any source — R2, filesystem, HTTP, etc.
    const response = await fetch(`https://cdn.example.com/content/${path}`);
    return response.ok ? await response.text() : null;
  },
  uiBaseUrl: 'https://cdn.example.com',
});

// Compose a view: loads content, walks parent chain, stitches slots
const result = await composer.compose('pages/about.md');
console.log(result);
```

---

## Architecture

```
compose('pages/about.md')
  │
  ├── 1. Load raw content via loader(path)
  │
  ├── 2. Parse frontmatter (YAML)
  │     ├── parent: "__sys_/layouts/default.md"
  │     └── skip: ["sidebar", "ads"]
  │
  ├── 3. Pre-process (convert <link mfe?> → data-interaction slots)
  │
  ├── 4. Recursive stitching
  │     │
  │     ├── Load parent content
  │     ├── Skip sections by ID
  │     ├── Inject child into <!-- slot:content --> or <!-- slot:body -->
  │     └── Repeat until no parent
  │
  └── 5. Hydrate {{UI_BASE}} placeholders
```

### Design Patterns Used

| Pattern | Purpose |
|---------|---------|
| **Composer** | Unified composition API |
| **Recursive Stitching** | Walks parent chain until root |
| **Slot Injection** | Replaces `<!-- slot:* -->` markers with child content |
| **Frontmatter-driven** | Parent/skip metadata in YAML frontmatter |

---

## API Reference

### `Composer`

#### Constructor

```typescript
new Composer(config: ComposerConfig)
```

**`ComposerConfig`**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `loader` | `(path: string) => Promise<string \| null>` | required | Content loader function |
| `uiBaseUrl` | `string` | `'http://localhost:8788'` | Base URL for `{{UI_BASE}}` placeholder hydration |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `compose(contentPath, defaultParent?)` | `Promise<string>` | Compose a view: load, stitch, hydrate |

### `compose(contentPath, defaultParent?)`

- `contentPath` — Path to the source markdown file
- `defaultParent` — Fallback parent path when frontmatter has no `parent` (default: `__sys_/base.md`)

Returns the fully stitched and hydrated markdown string.

---

## Frontmatter Reference

Content files use YAML frontmatter to control composition:

```yaml
---
parent: __sys_/layouts/default.md
skip:
  - sidebar
  - ads
---

# Page Content
...
```

| Field | Type | Description |
|-------|------|-------------|
| `parent` | `string` | Path to parent layout/template (recursive) |
| `skip` | `string[]` | Section IDs to remove from parent before stitching |

---

## Slot Placeholders

Parents declare where child content is injected:

| Placeholder | Behavior |
|-------------|----------|
| `<!-- slot:content -->` | Child content replaces this marker |
| `<!-- slot:body -->` | Child content replaces this marker |
| *(no slot)* | Child content is appended after parent |

---

## Asset Placeholder Hydration

Content can use `{{UI_BASE}}` placeholders that get replaced at compose time:

```markdown
<img src="{{UI_BASE}}/assets/logo.png" alt="Logo">
```

Configure via `uiBaseUrl` in `ComposerConfig`.

---

## Pre-processing

The composer converts `<link mfe?>` tags to interaction slots for `md2interact`:

```html
<!-- Input -->
<link mfe?>

<!-- Output -->
<div data-interaction="mfe:default" class="mfe-slot"></div>
```

---

## What md2compose is NOT

- **Not a renderer** — outputs markdown, not HTML
- **Not a router** — no URL matching or path resolution
- **Not a cache layer** — use `r2tohtml` for caching
- **Not a framework** — no virtual DOM, no state management
- **Not edge-specific** — works in Node.js, browser, Cloudflare Workers, Deno, Bun

---

## Integration with r2tohtml

`md2compose` pairs naturally with `@leadertechie/r2tohtml` for R2-backed content loading:

```typescript
import { Composer } from '@leadertechie/md2compose';
import { R2ContentLoader } from '@leadertechie/r2tohtml';

const loader = new R2ContentLoader({ bucket: MY_BUCKET });

const composer = new Composer({
  loader: async (path) => {
    const result = await loader.get(path);
    return result;
  },
  uiBaseUrl: 'https://cdn.example.com',
});

const page = await composer.compose('pages/home.md');
```

---

## License

MIT
