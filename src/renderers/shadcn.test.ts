import { MarkdownParser } from "../parser/MarkdownParser";
import { render } from "../renderer/walker";
import { shadcnRenderer } from "./shadcn";
import type {
  ButtonNode,
  CardNode,
  ContainerNode,
  GridNode,
  HeaderNode,
  ImageNode,
  InputNode,
  TableNode,
  TextNode,
  WorkflowNode,
} from "../parser/types";

describe("shadcnRenderer", () => {
  describe("per-handler output", () => {
    it("renders a header at the requested level with size class", () => {
      const ast: HeaderNode = {
        type: "header",
        level: 2,
        children: [{ type: "text", content: "Title" }],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(
        `<h2 key={0} className="text-3xl font-bold">Title</h2>`,
      );
    });

    it("renders a plain text node as a paragraph", () => {
      const ast: TextNode = { type: "text", content: "hello" };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<p key={0}>hello</p>`);
    });

    it("escapes JSX special characters in text content", () => {
      const ast: TextNode = { type: "text", content: "a < b & {c}" };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<p key={0}>a &lt; b &amp; &#123;c&#125;</p>`);
    });

    it("emits a text Input with auto-generated id and Label imports", () => {
      const ast: InputNode = {
        type: "input",
        label: "Email",
        inputType: "text",
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<Label htmlFor="input-0">Email</Label>`);
      expect(out).toContain(`<Input id="input-0" type="text" />`);
      expect(out).toContain(
        `import { Input } from "@/components/ui/input";`,
      );
      expect(out).toContain(
        `import { Label } from "@/components/ui/label";`,
      );
    });

    it("emits a Button with variant and no onClick when navigateTo is absent", () => {
      const ast: ButtonNode = {
        type: "button",
        content: "Save",
        variant: "default",
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<Button key={0} variant="default">Save</Button>`);
      expect(out).not.toContain("onClick");
    });

    it("emits onClick={setCurrentScreen} when button has navigateTo", () => {
      const ast: ButtonNode = {
        type: "button",
        content: "Next",
        variant: "default",
        navigateTo: "step2",
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(
        `<Button key={0} variant="default" onClick={() => setCurrentScreen('step2')}>Next</Button>`,
      );
    });

    it("renders an untitled card with pt-6 padding on its content", () => {
      const ast: CardNode = {
        type: "card",
        children: [{ type: "text", content: "body" }],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<Card key={0}>`);
      expect(out).toContain(`<CardContent className="pt-6 space-y-2">`);
      // No header for untitled
      expect(out).not.toContain("<CardTitle>");
    });

    it("renders a titled card with header and title rendered inline", () => {
      const ast: CardNode = {
        type: "card",
        titleChildren: [{ type: "text", content: "My Card" }],
        children: [{ type: "text", content: "body" }],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<CardHeader>`);
      expect(out).toContain(`<CardTitle>My Card</CardTitle>`);
      expect(out).toContain(`<CardContent className="space-y-2">`);
    });

    it("renders a grid with the configured Tailwind grid classes", () => {
      const ast: GridNode = {
        type: "grid",
        gridConfig: "cols-2 gap-4",
        children: [{ type: "text", content: "x" }],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<div key={0} className="grid cols-2 gap-4">`);
    });

    it("renders a container with flex children layout", () => {
      const ast: ContainerNode = {
        type: "container",
        children: [
          { type: "button", content: "a", variant: "outline" },
          { type: "button", content: "b", variant: "outline" },
        ],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<div key={0} className="flex gap-2">`);
      expect(out).toContain(`<Button key={0} variant="outline">a</Button>`);
      expect(out).toContain(`<Button key={1} variant="outline">b</Button>`);
    });

    it("renders a table with headers and rows", () => {
      const ast: TableNode = {
        type: "table",
        headers: ["Name", "Age"],
        rows: [
          ["Alice", "30"],
          ["Bob", "25"],
        ],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`<TableHead key={0}>Name</TableHead>`);
      expect(out).toContain(`<TableHead key={1}>Age</TableHead>`);
      expect(out).toContain(`<TableCell key={0}>Alice</TableCell>`);
      expect(out).toContain(`<TableCell key={1}>30</TableCell>`);
      expect(out).toContain(
        `import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";`,
      );
    });

    it("renders an image with src, alt, and styling", () => {
      const ast: ImageNode = {
        type: "image",
        src: "/x.png",
        alt: "x",
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(
        `<img key={0} src="/x.png" alt="x" className="max-w-full h-auto" />`,
      );
    });
  });

  describe("workflow handling", () => {
    it("emits useState + if/else chain for a multi-screen workflow", () => {
      const ast: WorkflowNode = {
        type: "workflow",
        initialScreen: "home",
        children: [
          {
            type: "screen",
            id: "home",
            children: [{ type: "text", content: "welcome" }],
          },
          {
            type: "screen",
            id: "next",
            children: [{ type: "text", content: "next page" }],
          },
        ],
      };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain("import { useState } from 'react';");
      expect(out).toContain(
        `const [currentScreen, setCurrentScreen] = useState('home');`,
      );
      expect(out).toContain(`if (currentScreen === 'home') {`);
      expect(out).toContain(`else if (currentScreen === 'next') {`);
      expect(out).toContain(`return <div>Screen not found</div>;`);
    });

    it("does NOT import useState when no workflow node is present", () => {
      const ast: TextNode = { type: "text", content: "hello" };
      const out = render([ast], shadcnRenderer);
      expect(out).not.toContain("import { useState }");
    });
  });

  describe("inline emphasis inside headers", () => {
    it("renders bold and italic children inline with <strong>/<em>", () => {
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
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(
        `<h1 key={0} className="text-4xl font-bold">a <strong key={1}>b</strong> c <em key={3}>d</em></h1>`,
      );
    });
  });

  describe("wrapping (end lifecycle)", () => {
    it("wraps body in GeneratedComponent with space-y-2 root", () => {
      const ast: TextNode = { type: "text", content: "hi" };
      const out = render([ast], shadcnRenderer);
      expect(out).toContain(`export function GeneratedComponent() {`);
      expect(out).toContain(`return (`);
      expect(out).toContain(`<div className="space-y-2">`);
      // 6-space base indent on top-level body line
      expect(out).toContain(`      <p key={0}>hi</p>`);
    });
  });

  describe("end-to-end fixture corpus", () => {
    const corpus: Array<{ name: string; source: string }> = [
      {
        name: "single header",
        source: "# Welcome",
      },
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
        name: "buttons (single, with and without navigation)",
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
        name: "header with bold-italic combo",
        source: "### Bold _*nested*_ italic",
      },
    ];

    test.each(corpus)("$name renders to a stable snapshot", ({ source }) => {
      const ast = new MarkdownParser().parse(source).nodes;
      expect(render(ast, shadcnRenderer)).toMatchSnapshot();
    });
  });
});
