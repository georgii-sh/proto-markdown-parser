# v2 — Public Renderer Plugin API

Implementation plan for the deepening of `ShadcnCodeGenerator` + `HtmlGenerator` into a public renderer plugin API. See [CONTEXT.md](../../CONTEXT.md) for vocabulary.

## Goal

Replace the two stand-alone generator classes with a public, semver-versioned renderer plugin API such that:

- Built-in **renderer**s (`shadcnRenderer`, `htmlRenderer`) implement the same `Renderer` interface as any third-party plugin (self-dogfooding).
- The **walker** is target-agnostic: traversal, indent, inline/block dispatch, key sequencing, lifecycle, `RendererError` on missing handler. Nothing target-specific.
- Adding a new target (Vue JSX, plain Markdown, MDX, custom design system) is one renderer module, not a class fork.
- The generators' currently-untested code (1595 lines of parser tests vs 0 generator tests) gains a real test surface: the `Renderer` interface.

## Constraints (decided in design session)

1. **Scope:** plugins extend rendering only. Parser remains closed. AST is fixed by the built-in parser.
2. **Versioning:** breaking change → major bump to **v2.0.0**. Old `ShadcnCodeGenerator` / `HtmlGenerator` classes are deleted.
3. **Public surface:** ~5–6 names in the core entry, plus two built-in renderers via sub-path exports.
4. **Bundling:** sub-path exports — `@protomarkdown/parser` (core), `@protomarkdown/parser/shadcn`, `@protomarkdown/parser/html`. Guaranteed tree-shake.
5. **Forward-compat:** unknown node type at runtime → `RendererError` (throw). Compile-time exhaustiveness via mapped type makes the situation impossible in practice; throw only fires on cross-version `.d.ts` mismatches.
6. **No walker-side workflow machinery.** Each renderer implements `nodes.workflow` itself.
7. **Default inline always exists.** Walker's default `inline.<type>` is "render content escaped, no wrapping" — always correct for any target. Renderers override to add visual emphasis.
8. **`MarkdownNode` becomes a discriminated union** — load-bearing prerequisite for `[K in NodeType]` to narrow inside handlers.

## Target public surface

```ts
// @protomarkdown/parser
export function render<TState>(
  nodes: readonly MarkdownNode[],
  renderer: Renderer<TState>,
  options?: RenderOptions,
): string;

export interface Renderer<TState = void> {
  readonly name: string;
  readonly version?: string;
  readonly nodes: { readonly [K in NodeType]: NodeHandler<K, TState> };
  readonly inline?: Partial<{ [K in NodeType]: NodeHandler<K, TState> }>;
  readonly escape?: (raw: string) => string;
  readonly begin?: (nodes: readonly MarkdownNode[]) => TState;
  readonly end?:   (body: string, state: TState) => string;
}

export interface RenderContext<TState> {
  readonly state: TState;
  readonly depth: number;
  readonly indent: string;
  readonly inline: boolean;
  readonly key: number;
  readonly parent: MarkdownNode | null;
  readonly escape: (s: string) => string;
  renderChildren(children: readonly MarkdownNode[] | undefined,
                 opts?: { indent?: number; inline?: boolean; join?: string }): string;
  renderNode(node: MarkdownNode): string;
}

export interface RenderOptions {
  readonly indentUnit?: string;     // default "  "
  readonly initialDepth?: number;
}

export class RendererError extends Error { /* renderer name, node type, path */ }

export type MarkdownNode = /* discriminated union — see Phase 0 */;
export type NodeType = MarkdownNode['type'];
export type NodeHandler<T extends NodeType, TState> =
  (node: Extract<MarkdownNode, { type: T }>, ctx: RenderContext<TState>) => string;

// @protomarkdown/parser/shadcn
export const shadcnRenderer: Renderer<ShadcnState>;

// @protomarkdown/parser/html
export const htmlRenderer: Renderer<HtmlState>;
```

## Phases (tracer bullets — each phase leaves the repo green)

### Phase 0 — Discriminated union for `MarkdownNode` ✅ DONE (commit `cd723f3`)

**Goal:** flip `MarkdownNode` from bag-of-17-optionals to a proper tagged union. Internal refactor, no public API change yet.

- Replace the single `MarkdownNode` interface in `src/parser/types.ts` with one variant per node type (`HeaderNode | InputNode | ButtonNode | …`). Each variant has only the fields that variant actually has, required not optional.
- Update `MarkdownParser` so every node it constructs matches its variant's shape (no more `{ type: 'header', level: 2 }` with implicit-undefined fields).
- Update both existing generators (still classes at this phase) to take advantage of type narrowing: replace `node.label || ""` with `node.label` where the variant guarantees `label`.
- All 1595 lines of parser tests must still pass. No behaviour change.
- Drop the deprecated `title` field on `CardNode` (only `titleChildren` survives).

**Done when:** `npm test` green, `tsc` clean, no `node.foo!` or `node.foo || ""` defensive checks remain except where the field is genuinely optional in its variant.

### Phase 1 — Walker + `Renderer` interface + tracer-bullet renderer ✅ DONE

**Goal:** prove the architecture end-to-end on a tiny slice. One node type, fully through the new pipeline, with tests.

**Outcome:** `src/renderer/types.ts` + `src/renderer/walker.ts` (~100 lines) + `src/renderer/walker.test.ts` (19 tests covering dispatch, indent, inline dispatch, missing-handler errors, lifecycle, state threading, ctx.parent, ctx.escape, ctx.key). Walker is internal to the package — not yet re-exported from `src/index.ts` (deferred to Phase 4).

- Create `src/renderer/` directory.
- Write `src/renderer/types.ts` — `Renderer`, `RenderContext`, `RenderOptions`, `NodeHandler`, `RendererError`.
- Write `src/renderer/walker.ts` — the `render()` engine. Implements: traversal, indent computation, `ctx.renderChildren` / `ctx.renderNode`, inline/block dispatch with default-inline-is-escape-only, key sequencing, `begin`/`end` lifecycle, `RendererError` on missing handler.
- Walker is ~50–80 lines. Keep it tight.
- Write `src/renderer/walker.test.ts` — exercise the walker with **stub renderers**. Tests include:
  - Trivial renderer (one node type) produces expected output.
  - Indent increments correctly across nested children.
  - `ctx.renderChildren({ indent: 2 })` doubles the depth bump (card-style nesting).
  - Inline mode dispatches to `inline.<type>` when present, falls back to escape-only default otherwise.
  - Missing handler throws `RendererError` with the node type in the message.
  - `begin`/`end` lifecycle runs exactly once; state threads through.
- Walker is **not** exported yet from `src/index.ts`. Internal until Phase 4.

**Done when:** walker tests green, walker module isolated, old generators untouched.

### Phase 2 — Port Shadcn to the new API ✅ DONE

**Outcome:** `src/renderers/shadcn.ts` + `src/renderers/shadcn.test.ts` (30 tests: per-handler units, workflow, inline emphasis, wrapping, and a 14-snippet parity corpus against `ShadcnCodeGenerator`). Full suite 172/172, `tsc --noEmit` clean. v1 class still present; both renderers coexist until Phase 4.

**Goal:** rewrite `ShadcnCodeGenerator` as `shadcnRenderer: Renderer<ShadcnState>` using only the public surface from Phase 1.

- Create `src/renderers/shadcn.ts`.
- `ShadcnState = { imports: Set<string>; hasWorkflow: boolean }`.
- One handler per node type. `nodes.workflow` writes the `useState` + `if/else if` chain and sets `state.hasWorkflow = true`. `nodes.button` writes `onClick={() => setCurrentScreen('…')}` whenever `node.navigateTo` is set (matches current behaviour). `end()` reads `state.imports` and `state.hasWorkflow` to prepend imports.
- Inline handlers for `bold`, `italic`, `text` — Shadcn-specific (`<strong>…</strong>`, `<em>…</em>`).
- Write `src/renderers/shadcn.test.ts` — **golden output tests** plus per-handler unit tests. Goldens cover: header, form fields, multi-field rows, cards (titled + untitled), grids, divs, tables, buttons (with and without navigation), workflows (single screen + multi-screen).
- Closes the zero-test gap on Shadcn output.
- The old `ShadcnCodeGenerator` class still exists; both produce output during this phase. Optionally add a parity test that runs both on a corpus and diffs the outputs to flag regressions.

**Done when:** `shadcnRenderer` passes its tests and produces output equivalent to `ShadcnCodeGenerator` on all current parser-test fixtures.

### Phase 3 — Port HTML to the new API ✅ DONE

**Outcome:** `src/renderers/html.ts` + `src/renderers/html.test.ts` (34 tests: per-handler units, workflow incl. standalone-screen and initialScreen fallback, inline emphasis, and a 16-snippet parity corpus against `HtmlGenerator`). `HtmlState = void` — HTML has no cross-render side effects. Renderer ignores `ctx.indent` because v1 embeds literal whitespace inside template literals; reproducing those template strings verbatim is what guarantees byte-equality. Full suite 206/206, `tsc --noEmit` clean.

**Goal:** same as Phase 2 for HTML. Mirror the structure exactly so the two renderers serve as a reference for third-party plugin authors.

- Create `src/renderers/html.ts` — `htmlRenderer: Renderer<HtmlState>`.
- `HtmlState = void` — HTML has no cross-render side effects.
- One handler per node type. `nodes.workflow` renders screens side-by-side with `data-screen-id` and marks the initial screen active. `nodes.button` emits `<button class="proto-button …" disabled>` with optional `<span class="proto-nav-indicator">→ <target></span>`.
- Inline handlers — HTML-specific (`<strong>`, `<em>`).
- Write `src/renderers/html.test.ts` — golden output tests + per-handler unit tests.

**Done when:** `htmlRenderer` passes its tests and produces output equivalent to `HtmlGenerator` on all current fixtures.

### Phase 4 — Sub-path exports, delete old, v2 bump, release

**Goal:** wire up the public surface. After this phase the v1 classes are gone and the library ships as v2.

- Update `rollup.config.js` to emit multiple bundles:
  - `dist/index.{js,esm.js,d.ts}` — `parser` + `render` + types + `RendererError`.
  - `dist/shadcn.{js,esm.js,d.ts}` — re-exports `shadcnRenderer`.
  - `dist/html.{js,esm.js,d.ts}` — re-exports `htmlRenderer`.
- Update `package.json` `exports`:
  ```json
  "exports": {
    ".":        { "types": "./dist/index.d.ts",  "import": "./dist/index.esm.js",  "require": "./dist/index.js" },
    "./shadcn": { "types": "./dist/shadcn.d.ts", "import": "./dist/shadcn.esm.js", "require": "./dist/shadcn.js" },
    "./html":   { "types": "./dist/html.d.ts",   "import": "./dist/html.esm.js",   "require": "./dist/html.js" }
  }
  ```
- Delete `src/ShadcnCodeGenerator.ts` and `src/HtmlGenerator.ts`.
- Update `src/index.ts` to export only the v2 surface (no `ShadcnCodeGenerator`, no `HtmlGenerator`).
- Create `src/shadcn.ts` re-exporting `shadcnRenderer` from `src/renderers/shadcn.ts`.
- Create `src/html.ts` re-exporting `htmlRenderer` from `src/renderers/html.ts`.
- Bump `package.json` `version` to `2.0.0`.
- Update `README.md` — new usage examples (`render(ast, shadcnRenderer)`), section on writing custom renderers.
- Update `CHANGELOG.md` — breaking changes called out, migration guide for v1 → v2.
- Update `CLAUDE.md` — public surface section, architecture section reflects walker/renderer split.

**Done when:** `npm run build` produces three bundles, `npm test` green, README compiles in the user's head as a coherent v2 story.

## Out of scope

- Parser plugin extensions (new syntax constructs from third parties) — design-session decision, deferred.
- `compose` / `patch` / `middleware` helpers for layering renderers — YAGNI. Can be added in v2.x non-breakingly.
- Pure `TargetEffect` reducers for side effects — current design uses mutable `TState`, sufficient for in-process pure-function rendering.
- Block-reader refactor of `parseCard` / `parseScreen` / `parseContainer` (deepening candidate #2) — independent of this plan.
- Pattern-table refactor of `parseLine` (deepening candidate #4) — independent.

## Risks and mitigations

- **Phase 0 is invasive.** Touches the parser, both generators, all 1595 lines of parser tests. Mitigation: do nothing else in that phase. Land it as a single commit on a feature branch, run the full test suite, only proceed when green.
- **Behavioural drift between v1 and v2 generators.** During Phases 2/3 both produce output. Mitigation: add a parity test that runs both on the parser-test corpus and asserts byte-equality of outputs (or whitespace-tolerant equality). Drift gets caught immediately.
- **Sub-path exports + Rollup config complexity.** Triple-entry Rollup can misfire on tree-shake. Mitigation: in Phase 4, build the package locally, install it into a throwaway consumer project, and verify the bundle for `import { htmlRenderer } from '@protomarkdown/parser/html'` does NOT include any Shadcn code.
- **v2 breaking change with no major-version users yet.** Acceptable: package is at v1.0.3, no known external consumers. CHANGELOG documents the break for posterity.
