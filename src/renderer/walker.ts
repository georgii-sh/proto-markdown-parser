import type { MarkdownNode } from "../parser/types";
import {
  Renderer,
  RenderContext,
  RenderOptions,
  RendererError,
} from "./types";

const DEFAULT_INDENT_UNIT = "  ";
const identity = (s: string) => s;

/**
 * Render an AST to a target-specific string by dispatching each node to its
 * `Renderer` handler. Pure: same input always produces the same output.
 *
 * Invariants:
 *  - `renderer.begin` is called exactly once, before any handler.
 *  - `renderer.end` is called exactly once, after all handlers, with the
 *    assembled body and the final `state`.
 *  - Handlers see a fresh `RenderContext` per call; nothing mutable leaks
 *    between sibling renders except `state`.
 *  - Top-level nodes are joined with `"\n"`; child join behaviour is controlled
 *    by the handler via `ctx.renderChildren({ join })`.
 *  - On a missing block handler: throws `RendererError` with the path from root.
 *  - On a missing inline handler: falls back to "render content escaped, or
 *    recurse on children inline" — always a safe default.
 */
export function render<TState>(
  nodes: readonly MarkdownNode[],
  renderer: Renderer<TState>,
  options: RenderOptions = {},
): string {
  const indentUnit = options.indentUnit ?? DEFAULT_INDENT_UNIT;
  const initialDepth = options.initialDepth ?? 0;
  const escape = renderer.escape ?? identity;

  const state = (renderer.begin ? renderer.begin(nodes) : undefined) as TState;
  const path: string[] = [];

  const defaultInline = (
    node: MarkdownNode,
    ctx: RenderContext<TState>,
  ): string => {
    const n = node as { content?: string; children?: MarkdownNode[] };
    if (n.children && n.children.length > 0) {
      return ctx.renderChildren(n.children, { inline: true, join: "" });
    }
    return ctx.escape(n.content ?? "");
  };

  const renderNodeAt = (
    node: MarkdownNode,
    depth: number,
    inline: boolean,
    key: number,
    parent: MarkdownNode | null,
  ): string => {
    path.push(node.type);
    try {
      const indent = inline ? "" : indentUnit.repeat(depth);
      const ctx: RenderContext<TState> = {
        state,
        depth,
        indent,
        inline,
        key,
        parent,
        escape,
        renderChildren(children, opts) {
          if (!children || children.length === 0) return "";
          const childDepth = depth + (opts?.indent ?? 1);
          const childInline = opts?.inline ?? inline;
          const childJoin = opts?.join ?? (childInline ? "" : "\n");
          return children
            .map((child, i) =>
              renderNodeAt(child, childDepth, childInline, i, node),
            )
            .join(childJoin);
        },
        renderNode(child) {
          return renderNodeAt(child, depth + 1, inline, 0, node);
        },
      };

      const handler = inline
        ? renderer.inline?.[node.type]
        : renderer.nodes[node.type];

      if (handler) {
        // Cast is safe: handler index is keyed by node.type
        return (handler as (n: MarkdownNode, c: RenderContext<TState>) => string)(node, ctx);
      }

      if (inline) {
        return defaultInline(node, ctx);
      }

      throw new RendererError(renderer.name, node.type, [...path]);
    } finally {
      path.pop();
    }
  };

  const body = nodes
    .map((node, i) => renderNodeAt(node, initialDepth, false, i, null))
    .join("\n");

  return renderer.end ? renderer.end(body, state) : body;
}
