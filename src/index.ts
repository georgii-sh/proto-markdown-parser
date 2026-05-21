// Parser (unchanged from v1).
export { MarkdownParser } from "./parser";

// AST surface — the discriminated union and its tag.
export type { MarkdownNode } from "./parser/types";
export type { NodeType } from "./parser/types";

// Renderer plugin API — the public extension surface for v2.
export { render } from "./renderer/walker";
export { RendererError } from "./renderer/types";
export type {
  Renderer,
  RenderContext,
  RenderOptions,
  RenderChildrenOptions,
  NodeHandler,
  NodeHandlers,
  InlineHandlers,
  NodeOf,
} from "./renderer/types";

// Built-in renderers ship from sub-path entries (./shadcn, ./html) to keep
// the core bundle free of target-specific code.
