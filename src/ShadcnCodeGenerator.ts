import { MarkdownNode } from "./parser/types";

/**
 * Generates React component code from a Proto Markdown AST using Shadcn UI components
 */
export class ShadcnCodeGenerator {
  private indentLevel = 0;
  private readonly indentSize = 2;
  private requiredImports = new Set<string>();

  /**
   * Generate complete React component code from markdown AST
   */
  generate(nodes: MarkdownNode[]): string {
    this.indentLevel = 0;
    this.requiredImports.clear();

    // Check if the component contains a workflow
    const hasWorkflow = nodes.some(node => node.type === 'workflow');

    // Generate component body
    const componentBody = this.generateNodes(nodes);

    // Add base indentation (6 spaces = 3 levels for proper JSX nesting)
    const indentedBody = componentBody
      .split('\n')
      .map(line => line ? `      ${line}` : line)
      .join('\n');

    // Collect imports
    const imports = this.generateImports();
    const reactImport = hasWorkflow ? "import { useState } from 'react';\n" : "";

    return `${reactImport}${imports}

export function GeneratedComponent() {
  return (
    <div className="space-y-2">
${indentedBody}
    </div>
  );
}
`;
  }

  /**
   * Generate imports based on used components
   */
  private generateImports(): string {
    const imports: string[] = [];

    if (this.requiredImports.has("Button")) {
      imports.push('import { Button } from "@/components/ui/button";');
    }
    if (this.requiredImports.has("Input")) {
      imports.push('import { Input } from "@/components/ui/input";');
    }
    if (this.requiredImports.has("Textarea")) {
      imports.push('import { Textarea } from "@/components/ui/textarea";');
    }
    if (this.requiredImports.has("Card")) {
      imports.push('import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";');
    }
    if (this.requiredImports.has("Checkbox")) {
      imports.push('import { Checkbox } from "@/components/ui/checkbox";');
    }
    if (this.requiredImports.has("RadioGroup")) {
      imports.push('import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";');
    }
    if (this.requiredImports.has("Select")) {
      imports.push('import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";');
    }
    if (this.requiredImports.has("Table")) {
      imports.push('import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";');
    }
    if (this.requiredImports.has("Label")) {
      imports.push('import { Label } from "@/components/ui/label";');
    }

    return imports.join("\n");
  }

  /**
   * Generate code for multiple nodes
   */
  private generateNodes(nodes: MarkdownNode[]): string {
    return nodes.map((node, index) => this.generateNode(node, index)).join("\n");
  }

  /**
   * Generate code for a single node
   */
  private generateNode(node: MarkdownNode, index: number): string {
    switch (node.type) {
      case "header":
        return this.generateHeader(node, index);
      case "input":
        return this.generateInput(node, index);
      case "textarea":
        return this.generateTextarea(node, index);
      case "dropdown":
        return this.generateDropdown(node, index);
      case "checkbox":
        return this.generateCheckbox(node, index);
      case "radiogroup":
        return this.generateRadioGroup(node, index);
      case "button":
        return this.generateButton(node, index);
      case "container":
        return this.generateContainer(node, index);
      case "card":
        return this.generateCard(node, index);
      case "table":
        return this.generateTable(node, index);
      case "grid":
        return this.generateGrid(node, index);
      case "div":
        return this.generateDiv(node, index);
      case "text":
        return this.generateText(node, index);
      case "bold":
        return this.generateBold(node, index);
      case "italic":
        return this.generateItalic(node, index);
      case "image":
        return this.generateImage(node, index);
      case "workflow":
        return this.generateWorkflow(node, index);
      case "screen":
        return this.generateScreen(node, index);
      default:
        return "";
    }
  }

  private indent(): string {
    return " ".repeat(this.indentLevel * this.indentSize);
  }

  private escapeJSX(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/{/g, "&#123;")
      .replace(/}/g, "&#125;");
  }

  private generateHeader(node: MarkdownNode, index: number): string {
    const Tag = `h${node.level}`;
    const className = `text-${node.level === 1 ? "4xl" : node.level === 2 ? "3xl" : node.level === 3 ? "2xl" : node.level === 4 ? "xl" : node.level === 5 ? "lg" : "base"} font-bold`;

    let content: string;
    if (node.children && node.children.length > 0) {
      // Inline children (emphasis)
      content = node.children.map((child, i) => this.generateInlineNode(child, i)).join("");
    } else {
      content = this.escapeJSX(node.content || "");
    }

    return `${this.indent()}<${Tag} key={${index}} className="${className}">${content}</${Tag}>`;
  }

  private generateInlineNode(node: MarkdownNode, index: number): string {
    switch (node.type) {
      case "bold":
        const boldContent = node.children?.map((child, i) => this.generateInlineNode(child, i)).join("") || this.escapeJSX(node.content || "");
        return `<strong key={${index}}>${boldContent}</strong>`;
      case "italic":
        const italicContent = node.children?.map((child, i) => this.generateInlineNode(child, i)).join("") || this.escapeJSX(node.content || "");
        return `<em key={${index}}>${italicContent}</em>`;
      case "text":
        if (node.children && node.children.length > 0) {
          return node.children.map((child, i) => this.generateInlineNode(child, i)).join("");
        }
        return this.escapeJSX(node.content || "");
      default:
        return this.escapeJSX(node.content || "");
    }
  }

  private generateInput(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Input");
    this.requiredImports.add("Label");
    const id = node.id || `input-${index}`;
    const type = node.inputType || "text";

    return `${this.indent()}<div key={${index}} className="space-y-2">
${this.indent()}  <Label htmlFor="${id}">${this.escapeJSX(node.label || "")}</Label>
${this.indent()}  <Input id="${id}" type="${type}" />
${this.indent()}</div>`;
  }

  private generateTextarea(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Textarea");
    this.requiredImports.add("Label");
    const id = node.id || `textarea-${index}`;

    return `${this.indent()}<div key={${index}} className="space-y-2">
${this.indent()}  <Label htmlFor="${id}">${this.escapeJSX(node.label || "")}</Label>
${this.indent()}  <Textarea id="${id}" />
${this.indent()}</div>`;
  }

  private generateDropdown(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Select");
    this.requiredImports.add("Label");
    const id = node.id || `select-${index}`;
    const options = node.options || [];

    return `${this.indent()}<div key={${index}} className="space-y-2">
${this.indent()}  <Label htmlFor="${id}">${this.escapeJSX(node.label || "")}</Label>
${this.indent()}  <Select>
${this.indent()}    <SelectTrigger id="${id}">
${this.indent()}      <SelectValue placeholder="Select an option" />
${this.indent()}    </SelectTrigger>
${this.indent()}    <SelectContent>
${options.map((opt, i) => `${this.indent()}      <SelectItem key={${i}} value="${opt.toLowerCase().replace(/\s+/g, "-")}">${this.escapeJSX(opt)}</SelectItem>`).join("\n")}
${this.indent()}    </SelectContent>
${this.indent()}  </Select>
${this.indent()}</div>`;
  }

  private generateCheckbox(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Checkbox");
    this.requiredImports.add("Label");
    const id = node.id || `checkbox-${index}`;

    return `${this.indent()}<div key={${index}} className="flex items-center space-x-2">
${this.indent()}  <Checkbox id="${id}" />
${this.indent()}  <Label htmlFor="${id}" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
${this.indent()}    ${this.escapeJSX(node.label || "")}
${this.indent()}  </Label>
${this.indent()}</div>`;
  }

  private generateRadioGroup(node: MarkdownNode, index: number): string {
    this.requiredImports.add("RadioGroup");
    this.requiredImports.add("Label");
    const options = node.options || [];

    return `${this.indent()}<div key={${index}} className="space-y-2">
${this.indent()}  <Label>${this.escapeJSX(node.label || "")}</Label>
${this.indent()}  <RadioGroup>
${options.map((opt, i) => {
      const optId = `radio-${index}-${i}`;
      const value = opt.toLowerCase().replace(/\s+/g, "-");
      return `${this.indent()}    <div className="flex items-center space-x-2">
${this.indent()}      <RadioGroupItem id="${optId}" value="${value}" />
${this.indent()}      <Label htmlFor="${optId}">${this.escapeJSX(opt)}</Label>
${this.indent()}    </div>`;
    }).join("\n")}
${this.indent()}  </RadioGroup>
${this.indent()}</div>`;
  }

  private generateButton(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Button");
    const variant = node.variant || "default";
    const className = node.className ? ` className="${node.className}"` : "";

    // Add onClick handler if button has navigation
    const onClick = node.navigateTo ? ` onClick={() => setCurrentScreen('${node.navigateTo}')}` : "";

    return `${this.indent()}<Button key={${index}} variant="${variant}"${className}${onClick}>${this.escapeJSX(node.content || "")}</Button>`;
  }

  private generateContainer(node: MarkdownNode, index: number): string {
    this.indentLevel++;
    const children = node.children ? this.generateNodes(node.children) : "";
    this.indentLevel--;

    return `${this.indent()}<div key={${index}} className="flex gap-2">
${children}
${this.indent()}</div>`;
  }

  private generateCard(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Card");

    let titleContent = "";
    if (node.titleChildren && node.titleChildren.length > 0) {
      titleContent = node.titleChildren.map((child, i) => this.generateInlineNode(child, i)).join("");
    } else if (node.title) {
      titleContent = this.escapeJSX(node.title);
    }

    // Increment by 2 to account for Card wrapper + CardContent nesting
    this.indentLevel += 2;
    const children = node.children ? this.generateNodes(node.children) : "";
    this.indentLevel -= 2;

    const cardContent = titleContent
      ? `${this.indent()}<Card key={${index}}>
${this.indent()}  <CardHeader>
${this.indent()}    <CardTitle>${titleContent}</CardTitle>
${this.indent()}  </CardHeader>
${this.indent()}  <CardContent className="space-y-2">
${children}
${this.indent()}  </CardContent>
${this.indent()}</Card>`
      : `${this.indent()}<Card key={${index}}>
${this.indent()}  <CardContent className="pt-6 space-y-2">
${children}
${this.indent()}  </CardContent>
${this.indent()}</Card>`;

    return cardContent;
  }

  private generateTable(node: MarkdownNode, index: number): string {
    this.requiredImports.add("Table");
    const headers = node.headers || [];
    const rows = node.rows || [];

    return `${this.indent()}<Table key={${index}}>
${this.indent()}  <TableHeader>
${this.indent()}    <TableRow>
${headers.map((header, i) => `${this.indent()}      <TableHead key={${i}}>${this.escapeJSX(header)}</TableHead>`).join("\n")}
${this.indent()}    </TableRow>
${this.indent()}  </TableHeader>
${this.indent()}  <TableBody>
${rows.map((row, i) => `${this.indent()}    <TableRow key={${i}}>
${row.map((cell, j) => `${this.indent()}      <TableCell key={${j}}>${this.escapeJSX(cell)}</TableCell>`).join("\n")}
${this.indent()}    </TableRow>`).join("\n")}
${this.indent()}  </TableBody>
${this.indent()}</Table>`;
  }

  private generateGrid(node: MarkdownNode, index: number): string {
    const gridClasses = `grid ${node.gridConfig || ""}`;

    this.indentLevel++;
    const children = node.children ? this.generateNodes(node.children) : "";
    this.indentLevel--;

    return `${this.indent()}<div key={${index}} className="${gridClasses}">
${children}
${this.indent()}</div>`;
  }

  private generateDiv(node: MarkdownNode, index: number): string {
    const className = node.className || "";

    this.indentLevel++;
    const children = node.children ? this.generateNodes(node.children) : "";
    this.indentLevel--;

    return `${this.indent()}<div key={${index}} className="${className}">
${children}
${this.indent()}</div>`;
  }

  private generateText(node: MarkdownNode, index: number): string {
    if (node.children && node.children.length > 0) {
      // Text with inline emphasis
      const inlineContent = node.children.map((child, i) => this.generateInlineNode(child, i)).join("");
      return `${this.indent()}<p key={${index}}>${inlineContent}</p>`;
    }
    return `${this.indent()}<p key={${index}}>${this.escapeJSX(node.content || "")}</p>`;
  }

  private generateBold(node: MarkdownNode, index: number): string {
    if (node.children && node.children.length > 0) {
      const content = node.children.map((child, i) => this.generateInlineNode(child, i)).join("");
      return `${this.indent()}<strong key={${index}}>${content}</strong>`;
    }
    return `${this.indent()}<strong key={${index}}>${this.escapeJSX(node.content || "")}</strong>`;
  }

  private generateItalic(node: MarkdownNode, index: number): string {
    if (node.children && node.children.length > 0) {
      const content = node.children.map((child, i) => this.generateInlineNode(child, i)).join("");
      return `${this.indent()}<em key={${index}}>${content}</em>`;
    }
    return `${this.indent()}<em key={${index}}>${this.escapeJSX(node.content || "")}</em>`;
  }

  private generateImage(node: MarkdownNode, index: number): string {
    const src = node.src || "";
    const alt = node.alt || "";

    return `${this.indent()}<img key={${index}} src="${src}" alt="${this.escapeJSX(alt)}" className="max-w-full h-auto" />`;
  }

  private generateWorkflow(node: MarkdownNode, index: number): string {
    const screens = node.children || [];
    const initialScreen = node.initialScreen || screens[0]?.id || "home";

    // Generate state management
    const stateDeclaration = `${this.indent()}const [currentScreen, setCurrentScreen] = useState('${initialScreen}');`;

    // Generate screen rendering
    this.indentLevel++;
    const screenCases = screens.map((screen, i) => {
      const screenId = screen.id || `screen-${i}`;
      const screenContent = screen.children ? this.generateNodes(screen.children) : "";

      return `${this.indent()}${i === 0 ? '' : 'else '}if (currentScreen === '${screenId}') {
${this.indent()}  return (
${this.indent()}    <div className="space-y-2">
${screenContent}
${this.indent()}    </div>
${this.indent()}  );
${this.indent()}}`;
    }).join('\n');
    this.indentLevel--;

    // Return fallback if no screen matches
    const fallback = `${this.indent()}return <div>Screen not found</div>;`;

    return `${this.indent()}<div key={${index}}>
${this.indent()}  {(() => {
${stateDeclaration}

${screenCases}
${fallback}
${this.indent()}  })()}
${this.indent()}</div>`;
  }

  private generateScreen(node: MarkdownNode, index: number): string {
    // Screens are handled within workflow generation
    // This method is for standalone screen nodes (if used outside workflow)
    this.indentLevel++;
    const children = node.children ? this.generateNodes(node.children) : "";
    this.indentLevel--;

    return `${this.indent()}<div key={${index}} data-screen-id="${node.id || index}" className="space-y-2">
${children}
${this.indent()}</div>`;
  }
}
