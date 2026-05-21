import type { MarkdownNode } from "../parser/types";
import type { Renderer } from "../renderer/types";

/**
 * Per-render mutable state for the Shadcn renderer.
 *
 *  - `imports` collects the Shadcn UI component names referenced anywhere in
 *    the AST. `end()` consults it to emit only the import statements that the
 *    generated component actually uses.
 *  - `hasWorkflow` is flipped on by `nodes.workflow`. `end()` adds the
 *    `import { useState } from 'react'` line only when a workflow is present.
 */
export interface ShadcnState {
  imports: Set<string>;
  hasWorkflow: boolean;
}

const HEADER_SIZE: Record<number, string> = {
  1: "4xl",
  2: "3xl",
  3: "2xl",
  4: "xl",
  5: "lg",
  6: "base",
};

function escapeJSX(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

function generateImports(imports: ReadonlySet<string>): string {
  const lines: string[] = [];
  if (imports.has("Button")) {
    lines.push('import { Button } from "@/components/ui/button";');
  }
  if (imports.has("Input")) {
    lines.push('import { Input } from "@/components/ui/input";');
  }
  if (imports.has("Textarea")) {
    lines.push('import { Textarea } from "@/components/ui/textarea";');
  }
  if (imports.has("Card")) {
    lines.push(
      'import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";',
    );
  }
  if (imports.has("Checkbox")) {
    lines.push('import { Checkbox } from "@/components/ui/checkbox";');
  }
  if (imports.has("RadioGroup")) {
    lines.push(
      'import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";',
    );
  }
  if (imports.has("Select")) {
    lines.push(
      'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";',
    );
  }
  if (imports.has("Table")) {
    lines.push(
      'import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";',
    );
  }
  if (imports.has("Label")) {
    lines.push('import { Label } from "@/components/ui/label";');
  }
  return lines.join("\n");
}

export const shadcnRenderer: Renderer<ShadcnState> = {
  name: "shadcn",
  escape: escapeJSX,

  begin: () => ({
    imports: new Set<string>(),
    hasWorkflow: false,
  }),

  end: (body, state) => {
    const indentedBody = body
      .split("\n")
      .map((line) => (line ? `      ${line}` : line))
      .join("\n");
    const imports = generateImports(state.imports);
    const reactImport = state.hasWorkflow
      ? "import { useState } from 'react';\n"
      : "";

    return `${reactImport}${imports}

export function GeneratedComponent() {
  return (
    <div className="space-y-2">
${indentedBody}
    </div>
  );
}
`;
  },

  nodes: {
    header: (node, ctx) => {
      const tag = `h${node.level}`;
      const size = HEADER_SIZE[node.level] ?? "base";
      const className = `text-${size} font-bold`;
      const content = ctx.renderChildren(node.children, { inline: true });
      return `${ctx.indent}<${tag} key={${ctx.key}} className="${className}">${content}</${tag}>`;
    },

    input: (node, ctx) => {
      ctx.state.imports.add("Input");
      ctx.state.imports.add("Label");
      const id = node.id ?? `input-${ctx.key}`;
      return `${ctx.indent}<div key={${ctx.key}} className="space-y-2">
${ctx.indent}  <Label htmlFor="${id}">${ctx.escape(node.label)}</Label>
${ctx.indent}  <Input id="${id}" type="${node.inputType}" />
${ctx.indent}</div>`;
    },

    textarea: (node, ctx) => {
      ctx.state.imports.add("Textarea");
      ctx.state.imports.add("Label");
      const id = node.id ?? `textarea-${ctx.key}`;
      return `${ctx.indent}<div key={${ctx.key}} className="space-y-2">
${ctx.indent}  <Label htmlFor="${id}">${ctx.escape(node.label)}</Label>
${ctx.indent}  <Textarea id="${id}" />
${ctx.indent}</div>`;
    },

    dropdown: (node, ctx) => {
      ctx.state.imports.add("Select");
      ctx.state.imports.add("Label");
      const id = node.id ?? `select-${ctx.key}`;
      const options = node.options ?? [];
      const items = options
        .map(
          (opt, i) =>
            `${ctx.indent}      <SelectItem key={${i}} value="${opt
              .toLowerCase()
              .replace(/\s+/g, "-")}">${ctx.escape(opt)}</SelectItem>`,
        )
        .join("\n");
      return `${ctx.indent}<div key={${ctx.key}} className="space-y-2">
${ctx.indent}  <Label htmlFor="${id}">${ctx.escape(node.label)}</Label>
${ctx.indent}  <Select>
${ctx.indent}    <SelectTrigger id="${id}">
${ctx.indent}      <SelectValue placeholder="Select an option" />
${ctx.indent}    </SelectTrigger>
${ctx.indent}    <SelectContent>
${items}
${ctx.indent}    </SelectContent>
${ctx.indent}  </Select>
${ctx.indent}</div>`;
    },

    checkbox: (node, ctx) => {
      ctx.state.imports.add("Checkbox");
      ctx.state.imports.add("Label");
      const id = node.id ?? `checkbox-${ctx.key}`;
      return `${ctx.indent}<div key={${ctx.key}} className="flex items-center space-x-2">
${ctx.indent}  <Checkbox id="${id}" />
${ctx.indent}  <Label htmlFor="${id}" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
${ctx.indent}    ${ctx.escape(node.label)}
${ctx.indent}  </Label>
${ctx.indent}</div>`;
    },

    radiogroup: (node, ctx) => {
      ctx.state.imports.add("RadioGroup");
      ctx.state.imports.add("Label");
      const items = node.options
        .map((opt, i) => {
          const optId = `radio-${ctx.key}-${i}`;
          const value = opt.toLowerCase().replace(/\s+/g, "-");
          return `${ctx.indent}    <div className="flex items-center space-x-2">
${ctx.indent}      <RadioGroupItem id="${optId}" value="${value}" />
${ctx.indent}      <Label htmlFor="${optId}">${ctx.escape(opt)}</Label>
${ctx.indent}    </div>`;
        })
        .join("\n");
      return `${ctx.indent}<div key={${ctx.key}} className="space-y-2">
${ctx.indent}  <Label>${ctx.escape(node.label)}</Label>
${ctx.indent}  <RadioGroup>
${items}
${ctx.indent}  </RadioGroup>
${ctx.indent}</div>`;
    },

    button: (node, ctx) => {
      ctx.state.imports.add("Button");
      const className = node.className ? ` className="${node.className}"` : "";
      const onClick = node.navigateTo
        ? ` onClick={() => setCurrentScreen('${node.navigateTo}')}`
        : "";
      return `${ctx.indent}<Button key={${ctx.key}} variant="${node.variant}"${className}${onClick}>${ctx.escape(node.content)}</Button>`;
    },

    text: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `${ctx.indent}<p key={${ctx.key}}>${content}</p>`;
    },

    container: (node, ctx) => {
      const children = ctx.renderChildren(node.children);
      return `${ctx.indent}<div key={${ctx.key}} className="flex gap-2">
${children}
${ctx.indent}</div>`;
    },

    card: (node, ctx) => {
      ctx.state.imports.add("Card");
      // Card wraps content in <CardContent>, so its children render two depth
      // levels deeper to align with the surrounding JSX.
      const children = ctx.renderChildren(node.children, { indent: 2 });
      const hasTitle = node.titleChildren && node.titleChildren.length > 0;
      if (hasTitle) {
        const titleContent = ctx.renderChildren(node.titleChildren, {
          inline: true,
        });
        return `${ctx.indent}<Card key={${ctx.key}}>
${ctx.indent}  <CardHeader>
${ctx.indent}    <CardTitle>${titleContent}</CardTitle>
${ctx.indent}  </CardHeader>
${ctx.indent}  <CardContent className="space-y-2">
${children}
${ctx.indent}  </CardContent>
${ctx.indent}</Card>`;
      }
      return `${ctx.indent}<Card key={${ctx.key}}>
${ctx.indent}  <CardContent className="pt-6 space-y-2">
${children}
${ctx.indent}  </CardContent>
${ctx.indent}</Card>`;
    },

    table: (node, ctx) => {
      ctx.state.imports.add("Table");
      const headers = node.headers
        .map(
          (h, i) =>
            `${ctx.indent}      <TableHead key={${i}}>${ctx.escape(h)}</TableHead>`,
        )
        .join("\n");
      const rows = node.rows
        .map(
          (row, i) =>
            `${ctx.indent}    <TableRow key={${i}}>
${row
  .map(
    (cell, j) =>
      `${ctx.indent}      <TableCell key={${j}}>${ctx.escape(cell)}</TableCell>`,
  )
  .join("\n")}
${ctx.indent}    </TableRow>`,
        )
        .join("\n");
      return `${ctx.indent}<Table key={${ctx.key}}>
${ctx.indent}  <TableHeader>
${ctx.indent}    <TableRow>
${headers}
${ctx.indent}    </TableRow>
${ctx.indent}  </TableHeader>
${ctx.indent}  <TableBody>
${rows}
${ctx.indent}  </TableBody>
${ctx.indent}</Table>`;
    },

    grid: (node, ctx) => {
      const gridClasses = `grid ${node.gridConfig}`;
      const children = ctx.renderChildren(node.children);
      return `${ctx.indent}<div key={${ctx.key}} className="${gridClasses}">
${children}
${ctx.indent}</div>`;
    },

    div: (node, ctx) => {
      const className = node.className ?? "";
      const children = ctx.renderChildren(node.children);
      return `${ctx.indent}<div key={${ctx.key}} className="${className}">
${children}
${ctx.indent}</div>`;
    },

    bold: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `${ctx.indent}<strong key={${ctx.key}}>${content}</strong>`;
    },

    italic: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `${ctx.indent}<em key={${ctx.key}}>${content}</em>`;
    },

    image: (node, ctx) =>
      `${ctx.indent}<img key={${ctx.key}} src="${node.src}" alt="${ctx.escape(node.alt)}" className="max-w-full h-auto" />`,

    workflow: (node, ctx) => {
      ctx.state.hasWorkflow = true;
      const screens = node.children;
      const initialScreen = node.initialScreen ?? screens[0]?.id ?? "home";
      // Workflow handler emits a hand-rolled IIFE; screen children render two
      // depth steps in (matches v1's `indentLevel++` inside generateWorkflow).
      const screenIndent = ctx.indent + "  ";
      const stateDecl = `${ctx.indent}const [currentScreen, setCurrentScreen] = useState('${initialScreen}');`;
      const screenCases = screens
        .map((screen, i) => {
          const screenContent = ctx.renderChildren(screen.children, {
            indent: 1,
          });
          return `${screenIndent}${i === 0 ? "" : "else "}if (currentScreen === '${screen.id}') {
${screenIndent}  return (
${screenIndent}    <div className="space-y-2">
${screenContent}
${screenIndent}    </div>
${screenIndent}  );
${screenIndent}}`;
        })
        .join("\n");
      // Fallback line sits at the workflow's own indent level, not the
      // screen-case level (matches v1: `this.indent()` after `indentLevel--`).
      const fallback = `${ctx.indent}return <div>Screen not found</div>;`;
      return `${ctx.indent}<div key={${ctx.key}}>
${ctx.indent}  {(() => {
${stateDecl}

${screenCases}
${fallback}
${ctx.indent}  })()}
${ctx.indent}</div>`;
    },

    screen: (node, ctx) => {
      // Reached only for standalone screens; inside a workflow the workflow
      // handler renders screen children directly.
      const children = ctx.renderChildren(node.children);
      return `${ctx.indent}<div key={${ctx.key}} data-screen-id="${node.id}" className="space-y-2">
${children}
${ctx.indent}</div>`;
    },
  },

  inline: {
    bold: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<strong key={${ctx.key}}>${content}</strong>`;
    },

    italic: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<em key={${ctx.key}}>${content}</em>`;
    },
  },
};

// Re-export to make the renderer type discoverable without crossing into
// /renderer/ (the walker package).
export type { MarkdownNode };
