import { MarkdownParser } from "../parser/MarkdownParser";
import { HtmlGenerator } from "../HtmlGenerator";
import { render } from "../renderer/walker";
import { htmlRenderer } from "./html";
import type {
  ButtonNode,
  CardNode,
  ContainerNode,
  DivNode,
  GridNode,
  HeaderNode,
  ImageNode,
  InputNode,
  RadioGroupNode,
  ScreenNode,
  TableNode,
  TextNode,
  WorkflowNode,
} from "../parser/types";

function renderBoth(source: string): { v1: string; v2: string } {
  const ast = new MarkdownParser().parse(source).nodes;
  const v1 = new HtmlGenerator().generate(ast);
  const v2 = render(ast, htmlRenderer);
  return { v1, v2 };
}

describe("htmlRenderer", () => {
  describe("per-handler output", () => {
    it("renders a header with proto-header class and inline children", () => {
      const ast: HeaderNode = {
        type: "header",
        level: 2,
        children: [{ type: "text", content: "Hi" }],
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<h2 class="proto-header">Hi</h2>`,
      );
    });

    it("renders a text node as a proto-text paragraph", () => {
      const ast: TextNode = { type: "text", content: "hello" };
      expect(render([ast], htmlRenderer)).toBe(
        `<p class="proto-text">hello</p>`,
      );
    });

    it("escapes HTML special characters in text content", () => {
      const ast: TextNode = {
        type: "text",
        content: `a < b & "c" 'd'`,
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<p class="proto-text">a &lt; b &amp; &quot;c&quot; &#039;d&#039;</p>`,
      );
    });

    it("renders an input field with placeholder for password type", () => {
      const ast: InputNode = {
        type: "input",
        label: "Password",
        inputType: "password",
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`<label class="proto-label">Password</label>`);
      expect(out).toContain(
        `<input type="password" class="proto-input" placeholder="••••••••" disabled />`,
      );
    });

    it("renders a button with nav indicator when navigateTo is set", () => {
      const ast: ButtonNode = {
        type: "button",
        content: "Next",
        variant: "default",
        navigateTo: "step2",
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<button class="proto-button proto-button-default" disabled>Next <span class="proto-nav-indicator">→ step2</span></button>`,
      );
    });

    it("renders a button without nav indicator by default", () => {
      const ast: ButtonNode = {
        type: "button",
        content: "Cancel",
        variant: "outline",
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<button class="proto-button proto-button-outline" disabled>Cancel</button>`,
      );
    });

    it("renders an untitled card without proto-card-header div", () => {
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "body" }],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`<div class="proto-card">`);
      expect(out).toContain(`<div class="proto-card-content">`);
      expect(out).not.toContain("proto-card-header");
    });

    it("renders a titled card with proto-card-header containing inline title", () => {
      const ast: CardNode = {
        type: "card",
        titleChildren: [{ type: "text", content: "Title" }],
        children: [],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(
        `<div class="proto-card-header">Title</div>`,
      );
    });

    it("renders a container as proto-container with inline children", () => {
      const ast: ContainerNode = {
        type: "container",
        children: [
          { type: "button", content: "a", variant: "outline" },
          { type: "button", content: "b", variant: "outline" },
        ],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`<div class="proto-container">`);
      expect(out).toContain(
        `<button class="proto-button proto-button-outline" disabled>a</button>`,
      );
      expect(out).toContain(
        `<button class="proto-button proto-button-outline" disabled>b</button>`,
      );
    });

    it("renders a grid with grid-template-columns and gap styles", () => {
      const ast: GridNode = {
        type: "grid",
        gridConfig: "cols-3 gap-4",
        children: [],
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<div class="proto-grid" style="grid-template-columns: repeat(3, 1fr); gap: 16px"></div>`,
      );
    });

    it("renders a div with className appended to proto-div", () => {
      const ast: DivNode = {
        type: "div",
        className: "my-class",
        children: [],
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<div class="proto-div my-class"></div>`,
      );
    });

    it("renders a table with proto-table classes on cells", () => {
      const ast: TableNode = {
        type: "table",
        headers: ["A", "B"],
        rows: [["1", "2"]],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`<th class="proto-table-th">A</th>`);
      expect(out).toContain(`<th class="proto-table-th">B</th>`);
      expect(out).toContain(`<td class="proto-table-td">1</td>`);
      expect(out).toContain(`<td class="proto-table-td">2</td>`);
    });

    it("renders an image with src and alt escaped", () => {
      const ast: ImageNode = {
        type: "image",
        src: "/x.png",
        alt: "x",
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<img class="proto-image" src="/x.png" alt="x" />`,
      );
    });

    it("renders a radio group with each option escaped", () => {
      const ast: RadioGroupNode = {
        type: "radiogroup",
        label: "Pick",
        options: ["A", "B"],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`<label class="proto-label">Pick</label>`);
      expect(out).toContain(`<label class="proto-radio-label">A</label>`);
      expect(out).toContain(`<label class="proto-radio-label">B</label>`);
      expect(out).toContain(`name="Pick"`);
    });
  });

  describe("workflow handling", () => {
    it("marks the initial screen with proto-screen-active and Initial badge", () => {
      const ast: WorkflowNode = {
        type: "workflow",
        initialScreen: "home",
        children: [
          {
            type: "screen",
            id: "home",
            children: [{ type: "text", content: "h" }],
          },
          {
            type: "screen",
            id: "next",
            children: [{ type: "text", content: "n" }],
          },
        ],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(
        `class="proto-screen proto-screen-active" data-screen-id="home"`,
      );
      expect(out).toContain(`<span class="proto-screen-initial">Initial</span>`);
      // Second screen is not active
      expect(out).toContain(`class="proto-screen" data-screen-id="next"`);
    });

    it("falls back to the first screen as initial when initialScreen is absent", () => {
      const ast: WorkflowNode = {
        type: "workflow",
        children: [
          { type: "screen", id: "first", children: [] },
          { type: "screen", id: "second", children: [] },
        ],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(
        `class="proto-screen proto-screen-active" data-screen-id="first"`,
      );
      expect(out).toContain(
        `class="proto-screen" data-screen-id="second"`,
      );
    });

    it("renders a standalone screen node with proto-screen wrapper", () => {
      const ast: ScreenNode = {
        type: "screen",
        id: "standalone",
        children: [{ type: "text", content: "hi" }],
      };
      const out = render([ast], htmlRenderer);
      expect(out).toContain(`data-screen-id="standalone"`);
      expect(out).toContain(`<span class="proto-screen-badge">standalone</span>`);
      expect(out).toContain(`<p class="proto-text">hi</p>`);
    });
  });

  describe("inline emphasis inside headers", () => {
    it("renders <strong> and <em> via inline handlers", () => {
      const ast: HeaderNode = {
        type: "header",
        level: 1,
        children: [
          { type: "text", content: "a " },
          { type: "bold", content: "b" },
          { type: "text", content: " c " },
          { type: "italic", content: "d" },
        ],
      };
      expect(render([ast], htmlRenderer)).toBe(
        `<h1 class="proto-header">a <strong>b</strong> c <em>d</em></h1>`,
      );
    });
  });

  describe("parity with HtmlGenerator", () => {
    const corpus: Array<{ name: string; source: string }> = [
      { name: "single header", source: "# Welcome" },
      {
        name: "header with emphasis",
        source: "## Hello *world* and _galaxy_",
      },
      {
        name: "all form field types",
        source: [
          "Email ___",
          "Password __*",
          "Description |___|",
          "Country __> [USA, Canada, Mexico]",
          "Remember me __[]",
        ].join("\n"),
      },
      {
        name: "dropdown without options uses default",
        source: "Role __>",
      },
      {
        name: "buttons (single)",
        source: "[(Submit)]\n[Cancel]",
      },
      {
        name: "multi-button row",
        source: "[(OK)] [Cancel]",
      },
      {
        name: "untitled card with content",
        source: "[--\nSome body text\n--]",
      },
      {
        name: "titled card with content",
        source: "[-- Card Title\nSome body text\n--]",
      },
      {
        name: "grid with cards",
        source: "[grid cols-2 gap-4\n[-- A --]\n[-- B --]\n]",
      },
      {
        name: "div with className",
        source: "[ custom-class\nInside\n]",
      },
      {
        name: "simple table",
        source: "| Name | Age |\n|------|-----|\n| Alice | 30 |",
      },
      {
        name: "single-screen workflow",
        source: "[workflow\n[screen home\n# Home\n]\n]",
      },
      {
        name: "multi-screen workflow with navigation",
        source: [
          "[workflow",
          "[screen welcome",
          "# Welcome",
          "[(Start) -> login]",
          "]",
          "[screen login",
          "# Login",
          "Email ___",
          "[(Login) -> home]",
          "[Back -> welcome]",
          "]",
          "[screen home",
          "# Home",
          "[Logout -> welcome]",
          "]",
          "]",
        ].join("\n"),
      },
      {
        name: "nested cards inside a grid",
        source: [
          "[grid cols-2 gap-4",
          "[-- Outer",
          "Text inside outer",
          "--]",
          "[-- Second",
          "Some text",
          "--]",
          "]",
        ].join("\n"),
      },
      {
        name: "header with nested bold-italic",
        source: "### Bold _*nested*_ italic",
      },
      {
        name: "text with HTML special chars",
        source: `Use & < > " ' carefully`,
      },
    ];

    test.each(corpus)("$name matches v1 byte-for-byte", ({ source }) => {
      const { v1, v2 } = renderBoth(source);
      expect(v2).toBe(v1);
    });
  });
});
