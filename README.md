# @protomarkdown/parser

Parser and renderer plugin API for [Proto Markdown](https://www.protomarkdown.org/documentation) — a UI prototyping markdown language for rapid React/HTML mockups.

## What's new in v2

- **Renderer plugin API.** Built-in renderers (`shadcnRenderer`, `htmlRenderer`) implement the same `Renderer` interface as any third-party plugin. Add a new target (Vue JSX, plain Markdown, MDX, your own design system) by writing one renderer module.
- **Sub-path exports.** Import only what you need: `@protomarkdown/parser` (core + walker), `@protomarkdown/parser/shadcn` (Shadcn renderer), `@protomarkdown/parser/html` (HTML renderer). Tree-shaking is guaranteed by separate bundles.
- **`MarkdownNode` is a discriminated union.** Handlers narrow on `node.type` and get fully-typed access to variant-specific fields.

Migrating from v1? See [CHANGELOG.md](./CHANGELOG.md#200---2026-05-21) for the migration guide.

## Installation

```bash
npm install @protomarkdown/parser
```

## Quick start — Shadcn JSX

```ts
import { MarkdownParser, render } from "@protomarkdown/parser";
import { shadcnRenderer } from "@protomarkdown/parser/shadcn";

const source = `
[-- Hello, world!
Email ___
Password __*
[(submit)][cancel]
--]`;

const ast = new MarkdownParser().parse(source).nodes;
const reactCode = render(ast, shadcnRenderer);
```

## Quick start — HTML preview

```ts
import { MarkdownParser, render } from "@protomarkdown/parser";
import { htmlRenderer } from "@protomarkdown/parser/html";

const ast = new MarkdownParser().parse(source).nodes;
const html = render(ast, htmlRenderer);
```

## Workflows — multi-screen navigation

```ts
const source = `
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
]`;

const ast = new MarkdownParser().parse(source).nodes;
const reactCode = render(ast, shadcnRenderer);
```

The Shadcn renderer emits a `useState` hook, an `if/else` chain over screens, and `onClick={() => setCurrentScreen(targetId)}` handlers on navigation buttons. The HTML renderer renders screens side-by-side with `data-screen-id` attributes; the initial screen receives `proto-screen-active`.

## Writing a custom renderer

A renderer is a target-specific bundle of handlers plus optional lifecycle hooks. The walker (the engine inside `render`) handles traversal, indent, inline/block dispatch, and `RendererError` on missing handlers — your handlers just produce strings.

```ts
import { MarkdownParser, render, type Renderer } from "@protomarkdown/parser";

interface MyState {
  imports: Set<string>;
}

const myRenderer: Renderer<MyState> = {
  name: "my-vue-renderer",
  // Optional: produce per-render state. Walker threads it through ctx.state.
  begin: () => ({ imports: new Set() }),
  // Optional: wrap the assembled body.
  end: (body, state) => `${[...state.imports].join("\n")}\n\n${body}`,
  // Optional: escape user-supplied strings for the target syntax.
  escape: (s) => s.replace(/</g, "&lt;"),
  // Required: one handler per node type. TypeScript enforces exhaustiveness.
  nodes: {
    header: (node, ctx) =>
      `${ctx.indent}<h${node.level}>${ctx.renderChildren(node.children, { inline: true })}</h${node.level}>`,
    button: (node, ctx) => {
      ctx.state.imports.add("import Button from './Button.vue'");
      return `${ctx.indent}<Button>${ctx.escape(node.content)}</Button>`;
    },
    // ... one handler per node type
  },
  // Optional: inline overrides. Default-inline (escape content) covers any
  // type you omit, so you usually only override bold/italic/etc. for visual
  // emphasis.
  inline: {
    bold: (node, ctx) => `<b>${ctx.escape(node.content ?? "")}</b>`,
  },
};

const ast = new MarkdownParser().parse(source).nodes;
const output = render(ast, myRenderer);
```

### What's in `ctx`?

The walker threads a fresh `RenderContext` into every handler call:

| Field | Description |
| --- | --- |
| `state` | Your renderer-private state from `begin`. Mutate freely. |
| `depth` | Current nesting depth (0 at the document root). |
| `indent` | Precomputed leading whitespace at `depth`. Empty in inline mode. |
| `inline` | `true` when descending under an inline parent (header, bold, italic, card title). |
| `key` | Sibling index. Useful for React `key={…}` attributes. |
| `parent` | The parent node, or `null` for top-level nodes. |
| `escape` | Bound `renderer.escape`, or identity if you didn't set one. |
| `renderChildren(children, opts?)` | Render a child list. The walker manages indent (`opts.indent`, default 1), inline/block (`opts.inline`, default inherits), and join (`opts.join`, default `"\n"` for block, `""` for inline). |
| `renderNode(node)` | Render one node as if it were a child of the current node. |

### Errors

Missing handler? The walker throws `RendererError` with the renderer name, the node type, and the descent path. The required `nodes` map is exhaustive over `NodeType` at compile time — a `RendererError` only fires in practice when a renderer was built against an older `.d.ts` than the running parser.

## Supported syntax

### Form fields

```
Email ___                          # Text input
Password __*                       # Password input
Description |___|                  # Textarea
Country __> [USA, Canada, Mexico]  # Dropdown with options
Remember me __[]                   # Checkbox
Gender __() [Male, Female, Other]  # Radio group
```

### Layouts

```
[-- Card Title                     # Card
Content here
--]

[grid cols-2 gap-4                 # Grid
  [-- Card 1 --]
  [-- Card 2 --]
]

[ flex gap-2                       # Custom div with classes
  Content
]
```

### Buttons

```
[(Submit)]                         # Default button
[Cancel]                           # Outline button
[(Save)][Reset]                    # Multiple buttons
[(Next) -> step2]                  # Navigation button (workflows)
```

### Tables

```
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
```

### Text formatting

```
This is *bold* text
This is _italic_ text
This is _*bold and italic*_ text
```

## API reference

### `MarkdownParser`

```ts
const result = new MarkdownParser().parse(source);
// result.nodes: MarkdownNode[]
// result.errors?: string[]
```

### `render(nodes, renderer, options?)`

Run a renderer over an AST.

```ts
function render<TState>(
  nodes: readonly MarkdownNode[],
  renderer: Renderer<TState>,
  options?: RenderOptions,
): string;

interface RenderOptions {
  indentUnit?: string;     // default "  "
  initialDepth?: number;   // default 0
}
```

### `Renderer<TState>`

See [Writing a custom renderer](#writing-a-custom-renderer).

### Built-in renderers

```ts
import { shadcnRenderer } from "@protomarkdown/parser/shadcn";
import { htmlRenderer } from "@protomarkdown/parser/html";
```

## Testing

```bash
npm test          # Run all tests (parser, walker, both renderers)
npm run build     # Build all three bundles
```

## License

Apache-2.0

## Links

- [Proto Markdown Documentation](https://www.protomarkdown.org/documentation)
- [GitHub Repository](https://github.com/georgii-sh/proto-markdown-parser)
- [Shadcn UI](https://ui.shadcn.com/)
