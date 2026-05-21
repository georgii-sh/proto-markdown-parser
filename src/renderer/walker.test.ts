import { render } from "./walker";
import {
  Renderer,
  RendererError,
  NodeHandlers,
  NodeHandler,
} from "./types";
import type {
  MarkdownNode,
  NodeType,
  HeaderNode,
  CardNode,
  BoldNode,
  TextNode,
  ButtonNode,
  ContainerNode,
} from "../parser/types";

const NODE_TYPES: NodeType[] = [
  "header", "input", "textarea", "dropdown", "button", "text",
  "container", "card", "table", "checkbox", "radiogroup", "grid",
  "div", "bold", "italic", "image", "workflow", "screen",
];

/** Build a `NodeHandlers` map filled with no-op handlers, then override a few. */
function makeHandlers<TState>(
  overrides: Partial<{ [K in NodeType]: NodeHandler<K, TState> }>,
): NodeHandlers<TState> {
  const result = {} as { [K in NodeType]: NodeHandler<K, TState> };
  for (const t of NODE_TYPES) {
    (result as any)[t] = (() => "") as NodeHandler<typeof t, TState>;
  }
  Object.assign(result, overrides);
  return result;
}

describe("render walker", () => {
  describe("trivial dispatch", () => {
    it("dispatches a single node to its handler and returns the result", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          header: (node) => `<h${node.level}>${node.children.length}</h${node.level}>`,
        }),
      };
      const ast: HeaderNode = {
        type: "header",
        level: 2,
        children: [{ type: "text", content: "hi" }],
      };

      expect(render([ast], renderer)).toBe("<h2>1</h2>");
    });

    it("joins top-level nodes with newline", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          header: (node) => `H${node.level}`,
          text: (node) => `T:${node.content ?? ""}`,
        }),
      };
      const ast: MarkdownNode[] = [
        { type: "header", level: 1, children: [] },
        { type: "text", content: "x" },
      ];

      expect(render(ast, renderer)).toBe("H1\nT:x");
    });
  });

  describe("indent context", () => {
    it("precomputes indent from depth using the default unit", () => {
      const seen: string[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          card: (node, ctx) => {
            seen.push(`card@${ctx.depth}:'${ctx.indent}'`);
            return ctx.renderChildren(node.children);
          },
          text: (_, ctx) => {
            seen.push(`text@${ctx.depth}:'${ctx.indent}'`);
            return "";
          },
        }),
      };
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "x" }],
      };

      render([ast], renderer);
      expect(seen).toEqual(["card@0:''", "text@1:'  '"]);
    });

    it("honours custom indentUnit", () => {
      const seen: string[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          card: (node, ctx) => {
            seen.push(`'${ctx.indent}'`);
            return ctx.renderChildren(node.children);
          },
          text: (_, ctx) => {
            seen.push(`'${ctx.indent}'`);
            return "";
          },
        }),
      };
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "x" }],
      };

      render([ast], renderer, { indentUnit: "\t" });
      expect(seen).toEqual(["''", "'\t'"]);
    });

    it("bumps depth by 2 when renderChildren({ indent: 2 }) is used (card-style)", () => {
      const seen: number[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          card: (node, ctx) => {
            seen.push(ctx.depth);
            return ctx.renderChildren(node.children, { indent: 2 });
          },
          text: (_, ctx) => {
            seen.push(ctx.depth);
            return "";
          },
        }),
      };
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "x" }],
      };

      render([ast], renderer);
      expect(seen).toEqual([0, 2]);
    });

    it("respects initialDepth option", () => {
      const seen: number[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          text: (_, ctx) => {
            seen.push(ctx.depth);
            return "";
          },
        }),
      };
      render([{ type: "text", content: "x" }], renderer, { initialDepth: 3 });
      expect(seen).toEqual([3]);
    });
  });

  describe("inline dispatch", () => {
    it("uses inline handler when descending in inline mode", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          header: (node, ctx) => `<h>${ctx.renderChildren(node.children, { inline: true })}</h>`,
        }),
        inline: {
          bold: (node) => `<b>${node.content ?? ""}</b>`,
        },
      };
      const ast: HeaderNode = {
        type: "header",
        level: 1,
        children: [{ type: "bold", content: "hi" } as BoldNode],
      };

      expect(render([ast], renderer)).toBe("<h><b>hi</b></h>");
    });

    it("falls back to default-inline (escape content) when no inline handler is set", () => {
      const renderer: Renderer = {
        name: "test",
        escape: (s) => s.toUpperCase(),
        nodes: makeHandlers({
          header: (node, ctx) => `[${ctx.renderChildren(node.children, { inline: true })}]`,
        }),
      };
      const ast: HeaderNode = {
        type: "header",
        level: 1,
        children: [{ type: "bold", content: "hi" } as BoldNode],
      };

      // No inline.bold → default inline → escape("hi") → "HI"
      expect(render([ast], renderer)).toBe("[HI]");
    });

    it("default-inline recurses into children when content is absent", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          header: (node, ctx) => ctx.renderChildren(node.children, { inline: true }),
        }),
      };
      const ast: HeaderNode = {
        type: "header",
        level: 1,
        children: [
          {
            type: "bold",
            children: [{ type: "text", content: "deep" } as TextNode],
          } as BoldNode,
        ],
      };

      expect(render([ast], renderer)).toBe("deep");
    });

    it("indent in inline mode is empty string regardless of depth", () => {
      const seen: string[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          header: (node, ctx) => ctx.renderChildren(node.children, { inline: true }),
        }),
        inline: {
          bold: (_, ctx) => {
            seen.push(`'${ctx.indent}'@d${ctx.depth}`);
            return "";
          },
        },
      };
      render(
        [
          {
            type: "header",
            level: 1,
            children: [{ type: "bold", content: "x" } as BoldNode],
          },
        ],
        renderer,
        { initialDepth: 5 },
      );
      expect(seen).toEqual(["''@d6"]);
    });
  });

  describe("missing handlers", () => {
    it("throws RendererError on missing block handler with renderer name, type, and path", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: {
          ...makeHandlers({}),
          // Deliberately delete one to simulate a renderer built against an older .d.ts
          header: undefined as unknown as NodeHandler<"header", void>,
        },
      };
      const ast: HeaderNode = { type: "header", level: 1, children: [] };

      expect(() => render([ast], renderer)).toThrow(RendererError);
      try {
        render([ast], renderer);
      } catch (e) {
        const err = e as RendererError;
        expect(err.rendererName).toBe("test");
        expect(err.nodeType).toBe("header");
        expect(err.path).toEqual(["header"]);
      }
    });

    it("path on error reflects the descent through parents", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: {
          ...makeHandlers({
            card: (node, ctx) => ctx.renderChildren(node.children),
          }),
          button: undefined as unknown as NodeHandler<"button", void>,
        },
      };
      const ast: CardNode = {
        type: "card",
        children: [
          { type: "button", content: "x", variant: "default" } as ButtonNode,
        ],
      };

      try {
        render([ast], renderer);
        fail("expected throw");
      } catch (e) {
        expect((e as RendererError).path).toEqual(["card", "button"]);
      }
    });
  });

  describe("lifecycle and state", () => {
    it("calls begin once before any handler and end once after with body+state", () => {
      const events: string[] = [];
      const renderer: Renderer<{ count: number }> = {
        name: "test",
        nodes: makeHandlers<{ count: number }>({
          text: (node, ctx) => {
            ctx.state.count++;
            events.push(`text:${node.content}`);
            return node.content ?? "";
          },
        }),
        begin: () => {
          events.push("begin");
          return { count: 0 };
        },
        end: (body, state) => {
          events.push(`end:body='${body}' count=${state.count}`);
          return body;
        },
      };

      render(
        [
          { type: "text", content: "a" } as TextNode,
          { type: "text", content: "b" } as TextNode,
        ],
        renderer,
      );

      expect(events).toEqual([
        "begin",
        "text:a",
        "text:b",
        "end:body='a\nb' count=2",
      ]);
    });

    it("end's return value replaces the body", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({ text: (n) => n.content ?? "" }),
        end: (body) => `<wrap>${body}</wrap>`,
      };
      const out = render([{ type: "text", content: "x" } as TextNode], renderer);
      expect(out).toBe("<wrap>x</wrap>");
    });
  });

  describe("ctx.parent", () => {
    it("top-level nodes have parent=null", () => {
      const seen: (string | null)[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          text: (_, ctx) => {
            seen.push(ctx.parent ? ctx.parent.type : null);
            return "";
          },
        }),
      };
      render([{ type: "text", content: "x" } as TextNode], renderer);
      expect(seen).toEqual([null]);
    });

    it("child nodes see their actual parent node", () => {
      const seen: (string | null)[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          card: (node, ctx) => ctx.renderChildren(node.children),
          text: (_, ctx) => {
            seen.push(ctx.parent ? ctx.parent.type : null);
            return "";
          },
        }),
      };
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "x" } as TextNode],
      };
      render([ast], renderer);
      expect(seen).toEqual(["card"]);
    });
  });

  describe("ctx.escape", () => {
    it("binds renderer.escape onto every ctx.escape", () => {
      const renderer: Renderer = {
        name: "test",
        escape: (s) => `<<${s}>>`,
        nodes: makeHandlers({
          text: (n, ctx) => ctx.escape(n.content ?? ""),
        }),
      };
      expect(render([{ type: "text", content: "x" } as TextNode], renderer)).toBe(
        "<<x>>",
      );
    });

    it("defaults to identity when renderer.escape is absent", () => {
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          text: (n, ctx) => ctx.escape(n.content ?? ""),
        }),
      };
      expect(render([{ type: "text", content: "<x>" } as TextNode], renderer)).toBe(
        "<x>",
      );
    });
  });

  describe("ctx.key", () => {
    it("sequences sibling keys 0,1,2,…", () => {
      const seen: number[] = [];
      const renderer: Renderer = {
        name: "test",
        nodes: makeHandlers({
          container: (node, ctx) => ctx.renderChildren(node.children),
          text: (_, ctx) => {
            seen.push(ctx.key);
            return "";
          },
        }),
      };
      const ast: ContainerNode = {
        type: "container",
        children: [
          { type: "text", content: "a" } as TextNode,
          { type: "text", content: "b" } as TextNode,
          { type: "text", content: "c" } as TextNode,
        ],
      };
      render([ast], renderer);
      expect(seen).toEqual([0, 1, 2]);
    });
  });
});
