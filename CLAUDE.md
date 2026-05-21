# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [CONTEXT.md](./CONTEXT.md) for the vocabulary glossary — **node**, **renderer**, **walker**, **handler**, **target state**, etc. Use those terms verbatim in code, comments, and PRs.

## Project Overview

A TypeScript library that parses Proto Markdown (a UI prototyping markdown language from protomarkdown.org) into a discriminated-union AST and renders it via the **renderer plugin API**. The library ships:

- **`MarkdownParser`** — turns a Proto Markdown source string into `MarkdownNode[]`.
- **`render(nodes, renderer, options?)`** — the walker engine. Target-agnostic; dispatches per-node handlers from a `Renderer<TState>` plugin.
- **`shadcnRenderer`** (sub-path `@protomarkdown/parser/shadcn`) — emits React component code using Shadcn UI components.
- **`htmlRenderer`** (sub-path `@protomarkdown/parser/html`) — emits HTML for preview rendering (used by the VS Code extension).

Third-party renderers (Vue, MDX, plain Markdown, design-system variants) implement the same `Renderer` interface as the built-ins.

## Build and Test Commands

```bash
# Build all three bundles (core, shadcn, html) via Rollup
npm run build

# Run all tests (parser, walker, both renderers, perf)
npm test

# Run a single test file
npm test -- src/parser/parser.test.ts
npm test -- src/renderer/walker.test.ts
npm test -- src/renderers/shadcn.test.ts

# Run tests matching a name pattern
npm test -- -t "workflow"

# Run only the parser perf benchmarks
npm test -- src/parser/parser.perf.test.ts

# Update snapshot fixtures (after intentional output changes)
npm test -- src/renderers/ -u
```

Tests use Jest with `ts-jest` in ESM mode (`jest.config.js`). Test files live alongside source. Snapshot files for the renderer fixture corpus live in `src/renderers/__snapshots__/`. All test files and snapshot dirs are excluded from the Rollup build via `tsconfig.json`.

## Architecture

### Parser (`src/parser/MarkdownParser.ts`)

Line-based parser with recursive descent for nested structures:

1. **Top-level `parse`**: processes Proto Markdown line by line, identifying workflows, tables, cards, grids, divs, and inline elements.
2. **Recursive parsers**:
   - `parseWorkflow` — `[workflow … ]`, orchestrates screen parsing.
   - `parseScreen` — `[screen id … ]` inside workflows.
   - `parseCard` — `[-- … --]` with depth tracking for nested cards.
   - `parseContainer` — `[grid …]` and `[<classes> …]` with depth tracking.
   - `parseLine` — inline elements (headers, inputs, buttons with navigation, text, etc.).
   - `parseInlineEmphasis` — `*bold*`, `_italic_`, `_*bold-italic*_`.
3. **Multi-element detection** — multiple form fields or buttons on one line are wrapped in a `container` node.
4. **Navigation detection** — buttons with `-> screenId` get a `navigateTo` field; only meaningful inside a workflow.

### AST (`src/parser/types.ts`)

`MarkdownNode` is a **discriminated union** keyed by `type`. One variant per node type (`HeaderNode`, `InputNode`, …, `WorkflowNode`, `ScreenNode`). Each variant has only the fields that variant actually has. The exhaustive list of types lives in `NodeType`.

Variant categories:
- Workflow nodes: `workflow` (contains screens, tracks `initialScreen`), `screen` (contains UI elements, has unique `id`).
- Container nodes: `card`, `container`, `grid`, `div`.
- Form elements: `input`, `textarea`, `dropdown`, `checkbox`, `radiogroup`.
- Content elements: `header`, `text`, `button` (optional `navigateTo`), `image`, `table`.
- Inline formatting: `bold`, `italic` (can nest via `children`).

### Walker (`src/renderer/walker.ts` + `src/renderer/types.ts`)

The walker is the target-agnostic engine inside `render()`. It owns:

- AST traversal (top-level join with `"\n"`; child join controlled by the handler via `ctx.renderChildren({ join })`).
- Indent computation (`ctx.indent = indentUnit.repeat(depth)`, empty in inline mode).
- Inline vs block dispatch — looks up `renderer.inline[type]` first when inline, falls back to `renderer.nodes[type]` otherwise. If no inline handler is set, falls back to a safe default: escape `content`, or recurse into `children` inline.
- Key sequencing — `ctx.key` is the sibling index.
- Lifecycle — `renderer.begin(nodes)` once before traversal, `renderer.end(body, state)` once after.
- Missing-handler errors — `RendererError` with renderer name, node type, and descent path.

Compile-time exhaustiveness is enforced by the `NodeHandlers<TState> = { [K in NodeType]: NodeHandler<K, TState> }` mapped type; renderers that omit a node type get a TypeScript error.

### Built-in renderers (`src/renderers/`)

#### `shadcnRenderer` (`src/renderers/shadcn.ts`)

`Renderer<ShadcnState>` where `ShadcnState = { imports: Set<string>; hasWorkflow: boolean }`.

- One handler per node type. Each handler that uses a Shadcn component calls `ctx.state.imports.add("Button")` (etc.).
- `nodes.workflow` writes the `useState` + `if/else if` chain, sets `state.hasWorkflow = true`, and renders each screen's children via `ctx.renderChildren(screen.children, { indent: 1 })`.
- `nodes.button` emits `onClick={() => setCurrentScreen('…')}` whenever `node.navigateTo` is set.
- `nodes.card` renders children with `{ indent: 2 }` — matches v1's `indentLevel += 2` for the Card → CardContent nesting.
- Inline handlers for `bold` and `italic` emit `<strong>`/`<em>` without the leading indent. Inline `text` falls through to the walker's default (escape only) — no handler needed.
- `end()` reads `state.imports` to assemble import statements, prepends `import { useState } from 'react';` when `state.hasWorkflow`, and wraps the body in `GeneratedComponent` with a 6-space base indent on every line.

#### `htmlRenderer` (`src/renderers/html.ts`)

`Renderer<void>` — HTML has no per-render side effects.

- One handler per node type; CSS classes prefixed with `proto-` for styling.
- Handlers **ignore `ctx.indent`** because v1's `HtmlGenerator` embeds literal whitespace inside template literals. The handlers reproduce those template strings verbatim to keep byte-equality with v1.
- `nodes.workflow` renders screens with `data-screen-id`, marks the initial screen with `proto-screen-active` and an `<Initial>` badge.
- `parseGridConfig` parses `cols-N gap-N` Tailwind-style tokens into inline CSS grid styles.
- `escape` adds single-quote escaping (`'` → `&#039;`) on top of the standard HTML escapes.

### Public surface (`src/index.ts`, `src/shadcn.ts`, `src/html.ts`)

The core entry (`src/index.ts`) exports the parser, the walker engine, and the renderer plugin types. Sub-path entries (`src/shadcn.ts`, `src/html.ts`) re-export their respective built-in renderers. Each entry compiles to its own CJS + ESM + `.d.ts` bundle, so a consumer of `@protomarkdown/parser/html` never pulls in Shadcn-specific code.

## Key Implementation Details

### Parser Edge Cases

- **Depth tracking** — cards, grids, and divs track nesting depth to correctly match opening and closing delimiters.
- **Order-dependent parsing** — card syntax must be checked before div syntax (since cards start with `[`).
- **Multi-field lines** — the parser checks for multiple fields before single fields to avoid partial matches.

### Shadcn renderer's two-axis indent

Two contributing systems:
- The walker's per-depth `ctx.indent` (default 2-space unit) handles dynamic JSX nesting.
- `end()` prepends a 6-space base indent to every line so the body sits cleanly inside `return ( … )`.

### HTML renderer ignores `ctx.indent`

The v1 `HtmlGenerator` template literals contain hand-tuned whitespace, not computed indents. The v2 renderer reproduces those template strings verbatim — `ctx.indent` is available but unused. This is intentional, not an oversight: it's what guarantees the v2 output is byte-equal to v1.

### Adding a new node type

1. Add a variant to `MarkdownNode` in `src/parser/types.ts` and append the tag to `NodeType`.
2. Wire the parser to emit it.
3. Add a handler to `nodes` in `shadcnRenderer` and `htmlRenderer`. TypeScript will refuse to compile until you do.
4. Add inline override(s) if the node can appear in inline contexts.
5. Add snapshot coverage to the renderer fixture corpus.

## Common Proto Markdown Patterns

```
# Headers with emphasis
## This is *bold* and _italic_

# Form fields
Email ___
Password __*
Description |___|
Country __> [USA, Canada, Mexico]
Remember me __[]

# Cards with nesting
[-- Card Title
Content here
--]

# Grids
[grid cols-2 gap-4
  [-- Card 1 --]
  [-- Card 2 --]
]

# Buttons
[(Submit)][Cancel]

# Buttons with navigation (for workflows)
[(Next) -> step2]
[Back -> step1]

# Tables
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |

# Workflows with multi-screen navigation
[workflow
  [screen welcome
    # Welcome
    [(Get Started) -> login]
  ]
  [screen login
    # Login
    Email ___
    Password __*
    [(Login) -> dashboard]
    [Back -> welcome]
  ]
  [screen dashboard
    # Dashboard
    Welcome to your dashboard!
    [Logout -> welcome]
  ]
]
```

## Package Configuration

- **Entry points**:
  - `src/index.ts` — `MarkdownParser`, `render`, `Renderer`, `RenderContext`, `RenderOptions`, `RendererError`, `MarkdownNode`, `NodeType`, plus the handler-typing helpers.
  - `src/shadcn.ts` — `shadcnRenderer`, `ShadcnState`.
  - `src/html.ts` — `htmlRenderer`, `HtmlState`.
- **Build output** — three separate dual (CJS + ESM) bundles with `.d.ts` per entry, plus declaration files for the internal `src/parser/`, `src/renderer/`, and `src/renderers/` directories so consumers can navigate to internal types if they want.
- **Module system** — ESNext with ES2020 target.
- **Bundler** — Rollup, one config object per entry (see `rollup.config.js`).
- **Package exports** — `package.json` `exports` map gates each sub-path with `types` / `import` / `require` conditions.
