# Proto Markdown Parser — Context

This is a TypeScript library that parses **Proto Markdown** (a UI-prototyping DSL from protomarkdown.org) into an AST and renders it to one or more output **targets** (Shadcn JSX, HTML, and any third-party renderer plugins).

## Language

**Proto Markdown**:
The source DSL the library parses — a line-oriented markup language for sketching UI layouts.
_Avoid_: "markdown" alone (collides with CommonMark); "the syntax".

**Parser**:
The `MarkdownParser` module — turns a Proto Markdown source string into an array of **Node**s.
_Avoid_: "tokenizer", "lexer" (we do recursive-descent block parsing, not tokenizing).

**Node**:
One element of the AST. Discriminated union keyed by `type`. Represented by the `MarkdownNode` type.
_Avoid_: "element" (ambiguous with HTML/DOM); "token".

**Node type**:
The discriminant of a **Node**. One of: `header`, `input`, `textarea`, `dropdown`, `button`, `text`, `container`, `card`, `table`, `checkbox`, `radiogroup`, `grid`, `div`, `bold`, `italic`, `image`, `workflow`, `screen`.

**Renderer**:
A plugin that converts the AST into a string for a specific **target**. The public plugin interface for v2. Built-in renderers (`shadcnRenderer`, `htmlRenderer`) use the same interface as any third-party renderer.
_Avoid_: "generator" (v1 name, retired); "transformer"; "visitor".

**Target**:
The output format a **renderer** produces — e.g. Shadcn React JSX, HTML, plain Markdown, Vue SFC. A renderer is identified by its target.
_Avoid_: "backend", "output format" used vaguely.

**Walker**:
Private module inside the renderer engine. Owns AST traversal, indent computation, inline/block dispatch, key sequencing, and the runtime lookup of **handler**s on the renderer. Not exported.
_Avoid_: "visitor" (visitor pattern implies double-dispatch on Node, which we don't use); "traverser".

**Handler** / **NodeHandler**:
A function on a **Renderer** that produces the output string for one **Node type**: `(node, ctx) => string`. The renderer declares one handler per node type in its `nodes` map (exhaustive, enforced by mapped type), and may declare per-type inline handlers in `inline`.

**RenderContext**:
The immutable value the **walker** threads through each handler call. Carries `depth`, precomputed `indent`, `inline` flag, current `parent`, target-specific `state`, and `renderChildren` / `renderNode` re-entrant calls.

**Target state** / **TState**:
The renderer-private bag of values produced by `Renderer.begin` and threaded through `RenderContext.state`. Holds things like Shadcn's `Set<string>` of required imports. Owned by the renderer; the walker treats it as opaque.

**Workflow**:
A Proto Markdown construct (`[workflow … ]`) that contains multiple **screen**s with navigation between them. A node type — not a walker concept. Each renderer decides how to materialise it.

**Screen**:
A node inside a **workflow** with a unique `id` and arbitrary child nodes. Navigation targets it via the screen's id.

**Card** / **Grid** / **Div** / **Container**:
Layout node types. `card` is `[-- … --]`. `grid` is `[grid <classes> … ]`. `div` is `[<classes> … ]`. `container` is a parser-internal wrapper for multi-element lines (multiple form fields or multiple buttons).

## Relationships

- A **Parser** produces a list of **Node**s (the AST).
- A **Renderer** is consumed by `render(nodes, renderer)` to produce a string for one **target**.
- The **walker** lives inside `render` and invokes the renderer's **handlers**.
- Each **handler** can recurse via `ctx.renderChildren` / `ctx.renderNode` — the walker, not the handler, manages indent and inline/block context.
- A **workflow** Node contains **screen** Nodes; each screen contains arbitrary other Nodes.
- Built-in renderers (`shadcnRenderer`, `htmlRenderer`) implement `Renderer` — same surface as any third-party renderer.

## Example dialogue

> **Dev:** "Where does Shadcn's `useState` import come from when there's a workflow?"
> **Maintainer:** "The Shadcn **renderer**'s `workflow` **handler** sets a flag in its **target state**; the renderer's `end` hook reads the flag and prepends the import. No special **walker** machinery — `workflow` is just another **node type** to the walker."

> **Dev:** "If I write a Vue **renderer**, do I have to handle `workflow` specially?"
> **Maintainer:** "Yes — the **walker** doesn't know what a workflow is. Your `nodes.workflow` **handler** decides how to materialise it for your **target**. Same as for `card` or `grid`."

## Flagged ambiguities

- **"generator" vs "renderer"** — `ShadcnCodeGenerator` and `HtmlGenerator` are the v1 names; the v2 public API calls these **renderer**s. The word "generator" is retired in v2 to avoid confusion with the `Renderer` plugin interface and to reflect that the new modules consume an AST rather than generate from input.

- **"component"** — overloaded. Use "Shadcn component" or "React component" when referring to a thing in the renderered output. Use **module** (per [LANGUAGE.md](.claude/skills/improve-codebase-architecture/LANGUAGE.md) — a unit with an interface and an implementation) when referring to a thing in the codebase architecture. Never use "component" alone.

- **"visitor"** — avoid. The walker is not a visitor in the GoF sense (no double dispatch on the node; nodes are plain data). Use **walker** for the traversal module and **handler** for the per-type render functions.
