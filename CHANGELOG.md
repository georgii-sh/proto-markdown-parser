# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-05-21

### Breaking changes

- **`ShadcnCodeGenerator` and `HtmlGenerator` classes are removed.** Replace them with `render(ast, shadcnRenderer)` / `render(ast, htmlRenderer)`. Output is byte-identical to v1 — captured as snapshots before the v1 classes were deleted.
- **Sub-path imports for built-in renderers.** `shadcnRenderer` ships from `@protomarkdown/parser/shadcn`, `htmlRenderer` from `@protomarkdown/parser/html`. The core entry no longer pulls in target-specific code, so consumers of one renderer no longer pay the bundle cost of the other.
- **`MarkdownNode` is now a discriminated union.** Each `type` value carries only the fields that variant actually has. Code that read `node.label`, `node.children`, etc. without first narrowing on `node.type` will now require a `node.type === 'input'` (etc.) guard.
- **`CardNode.title` (deprecated string field) is gone.** Use `titleChildren` (`MarkdownNode[]`) — the parser has populated it since v1.0.x.

### Added

- **Renderer plugin API.** `render`, `Renderer<TState>`, `RenderContext<TState>`, `RenderOptions`, `RendererError`, `NodeHandler`, `NodeHandlers`, `InlineHandlers`, `NodeOf<T>`. Built-in renderers implement the same interface as any third-party renderer.
- **Walker** (`src/renderer/walker.ts`) is the target-agnostic traversal engine: indent computation, inline/block dispatch with safe default-inline, key sequencing, `begin`/`end` lifecycle, `RendererError` on missing handler.
- **Snapshot fixture corpus.** Both built-in renderers ship snapshot tests over a corpus of representative Proto Markdown snippets, capturing the v1-equivalent output as the regression baseline going forward.

### Migration guide (v1 → v2)

#### 1. Update imports

```diff
- import { MarkdownParser, ShadcnCodeGenerator } from "@protomarkdown/parser";
+ import { MarkdownParser, render } from "@protomarkdown/parser";
+ import { shadcnRenderer } from "@protomarkdown/parser/shadcn";
```

```diff
- import { MarkdownParser, HtmlGenerator } from "@protomarkdown/parser";
+ import { MarkdownParser, render } from "@protomarkdown/parser";
+ import { htmlRenderer } from "@protomarkdown/parser/html";
```

#### 2. Replace generator instantiation with `render`

```diff
- const generator = new ShadcnCodeGenerator();
- const code = generator.generate(ast.nodes);
+ const code = render(ast.nodes, shadcnRenderer);
```

```diff
- const generator = new HtmlGenerator();
- const html = generator.generate(ast.nodes);
+ const html = render(ast.nodes, htmlRenderer);
```

The generated string is byte-identical to v1 output — drop-in replacement.

#### 3. Narrow on `node.type` before reading variant-specific fields

Code that reached into `MarkdownNode` directly will now hit TypeScript errors. Add a discriminant guard:

```diff
- if (node.label) { console.log(node.label); }
+ if (node.type === "input" || node.type === "checkbox" || node.type === "dropdown") {
+   console.log(node.label);
+ }
```

If you only used the parser (no direct AST inspection), no change needed — the parser API is unchanged.

#### 4. Replace `CardNode.title` with `CardNode.titleChildren`

```diff
- if (node.type === "card" && node.title) { renderHeader(node.title); }
+ if (node.type === "card" && node.titleChildren) { renderHeaderNodes(node.titleChildren); }
```

`titleChildren` is `MarkdownNode[]` of inline-emphasis nodes; iterate and render them as inline content rather than a single string.

#### 5. Custom output target? Build a renderer plugin

If you previously forked `ShadcnCodeGenerator` to emit a different target, you can now write a `Renderer<TState>` plugin against the public surface — no monkey-patching, no class extension. See the [README](./README.md#writing-a-custom-renderer) for the full walkthrough.

### Internal

- Build emits three separate bundles (core, shadcn, html) so consumers of one sub-path never pull in the other renderer's code.
- Test count: 206 (parser, walker, both renderers) + 30 snapshots covering the end-to-end fixture corpus.

## [1.0.3] - 2026-01-02

### Added

- Support for tables inside cards, divs, grids, and screens
- New `parseTable` helper method for reusable table parsing logic

### Example

Tables can now be nested inside container elements:

```
[-- Shopping Cart
  # Your Cart

  | Product | Qty | Price |
  |---------|-----|-------|
  | Widget  | 1   | $10   |

  [(Checkout)]
--]
```

## [1.0.2] - Previous Release

- Initial stable release with MarkdownParser, ShadcnCodeGenerator, and HtmlGenerator
