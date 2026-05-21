import type { MarkdownNode, NodeType } from "../parser/types";

/** Narrow a `MarkdownNode` to a specific variant by its `type` tag. */
export type NodeOf<T extends NodeType> = Extract<MarkdownNode, { type: T }>;

/**
 * One render function per node variant. Receives the typed node and a
 * `RenderContext`. Returns the target-specific string for this node.
 *
 * Handlers recurse via `ctx.renderChildren` / `ctx.renderNode` — the walker,
 * not the handler, manages traversal, indent, inline/block context, and key
 * sequencing.
 */
export type NodeHandler<T extends NodeType, TState> = (
  node: NodeOf<T>,
  ctx: RenderContext<TState>,
) => string;

/**
 * Required, exhaustive handler map: one entry per `NodeType`. TypeScript flags
 * a missing handler as a compile error in the renderer's package.
 */
export type NodeHandlers<TState> = {
  readonly [K in NodeType]: NodeHandler<K, TState>;
};

/**
 * Optional inline overrides. When the walker descends in inline mode, it
 * prefers `inline[type]`; if absent, it falls back to the default inline
 * behaviour (render `content` escaped, or recurse on `children` inline).
 */
export type InlineHandlers<TState> = Partial<{
  readonly [K in NodeType]: NodeHandler<K, TState>;
}>;

/**
 * A renderer is a target-specific bundle of handlers plus optional lifecycle
 * hooks. Stateless across calls: `begin` produces fresh `TState` per render.
 */
export interface Renderer<TState = void> {
  /** Stable identifier; surfaces in error messages. */
  readonly name: string;
  /** Renderer's own semver; independent of `@protomarkdown/parser`. */
  readonly version?: string;
  /** Per-variant block handlers. Required, exhaustive. */
  readonly nodes: NodeHandlers<TState>;
  /** Per-variant inline overrides. Optional. */
  readonly inline?: InlineHandlers<TState>;
  /** Escape user-supplied strings for the target syntax. Default: identity. */
  readonly escape?: (raw: string) => string;
  /** Called once before traversal. Returns the renderer-private state seed. */
  readonly begin?: (nodes: readonly MarkdownNode[]) => TState;
  /** Called once after traversal. Wraps the assembled body. */
  readonly end?: (body: string, state: TState) => string;
}

export interface RenderChildrenOptions {
  /** Depth bump for the children. Default 1. Use 2 for card-style double nesting. */
  readonly indent?: number;
  /** Force inline mode for the children. Default: inherit current `ctx.inline`. */
  readonly inline?: boolean;
  /** Separator between rendered children. Default `"\n"` for block, `""` for inline-style concatenation. */
  readonly join?: string;
}

/**
 * Immutable per-call context threaded through every handler invocation. A
 * fresh context object is built for each node; mutate `state` for cross-render
 * side effects, but treat all other fields as read-only.
 */
export interface RenderContext<TState> {
  /** Renderer-private state, produced by `Renderer.begin`. */
  readonly state: TState;
  /** Current nesting depth. 0 at the document root (or `options.initialDepth`). */
  readonly depth: number;
  /** Precomputed leading whitespace at `depth`. Empty string in inline mode. */
  readonly indent: string;
  /** True when descending under an inline parent (header/bold/italic/title). */
  readonly inline: boolean;
  /** Index of this node within its sibling list. Useful for React `key={…}`. */
  readonly key: number;
  /** The parent node, or `null` for top-level nodes. */
  readonly parent: MarkdownNode | null;
  /** Bound escape function from `Renderer.escape` (or identity). */
  readonly escape: (s: string) => string;
  /** Render a child list. Walker manages indent, key, inline/block, and join. */
  renderChildren(
    children: readonly MarkdownNode[] | undefined,
    opts?: RenderChildrenOptions,
  ): string;
  /** Render a single node as if it were a child of the current node. */
  renderNode(node: MarkdownNode): string;
}

export interface RenderOptions {
  /** Indent unit. Default `"  "` (two spaces). */
  readonly indentUnit?: string;
  /** Starting depth, for embedding output inside an outer container. Default 0. */
  readonly initialDepth?: number;
}

/**
 * Thrown when the walker encounters a node type with no handler in the
 * renderer's `nodes` map. Compile-time exhaustiveness on `NodeHandlers` makes
 * this unreachable in normal use; it surfaces only when a renderer was built
 * against an older `.d.ts` than the running parser.
 */
export class RendererError extends Error {
  readonly rendererName: string;
  readonly nodeType: string;
  readonly path: readonly string[];

  constructor(rendererName: string, nodeType: string, path: readonly string[]) {
    super(
      `Renderer '${rendererName}' has no handler for node type '${nodeType}' at path [${path.join(
        " > ",
      )}]`,
    );
    this.name = "RendererError";
    this.rendererName = rendererName;
    this.nodeType = nodeType;
    this.path = path;
  }
}
