import { MarkdownNode, ParserOptions, ParseResult } from "./types";

export class MarkdownParser {
  private options: ParserOptions;

  constructor(options: ParserOptions = {}) {
    this.options = {
      strict: false,
      preserveWhitespace: false,
      ...options,
    };
  }

  parse(markdown: string): ParseResult {
    const lines = markdown.split("\n");
    const nodes: MarkdownNode[] = [];
    const errors: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = this.options.preserveWhitespace ? lines[i] : lines[i].trim();

      if (!line) {
        i++;
        continue;
      }

      // Check for table (line with pipes)
      if (line.includes("|") && line.trim().startsWith("|")) {
        const headers = line
          .split("|")
          .map((h) => h.trim())
          .filter((h) => h.length > 0);

        i++;
        // Skip separator line (|---|---|)
        if (i < lines.length) {
          const separatorLine = this.options.preserveWhitespace
            ? lines[i]
            : lines[i].trim();
          if (separatorLine.includes("-") && separatorLine.includes("|")) {
            i++;
          }
        }

        // Parse table rows
        const rows: string[][] = [];
        while (i < lines.length) {
          const rowLine = this.options.preserveWhitespace
            ? lines[i]
            : lines[i].trim();

          if (!rowLine || !rowLine.includes("|")) {
            break;
          }

          const cells = rowLine
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          rows.push(cells);
          i++;
        }

        nodes.push({
          type: "table",
          headers,
          rows,
        });
        continue;
      }

      // Check for card start
      const cardMatch = line.match(/^\[--\s*(.*)$/);
      if (cardMatch) {
        const result = this.parseCard(lines, i, cardMatch[1] || undefined);
        nodes.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for grid start ([grid cols-2 gap-4)
      const gridMatch = line.match(/^\[grid\s+(.*)$/);
      if (gridMatch) {
        const result = this.parseContainer(lines, i, 'grid', gridMatch[1]);
        nodes.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for plain div start ([ or [ class-name)
      const divMatch = line.match(/^\[\s*(.*)$/);
      if (divMatch && !line.includes("]")) {
        const result = this.parseContainer(lines, i, 'div', divMatch[1] || '');
        nodes.push(result.node);
        i = result.nextIndex;
        continue;
      }

      const node = this.parseLine(line);
      if (node) {
        nodes.push(node);
      } else if (this.options.strict) {
        errors.push(`Line ${i + 1}: Unable to parse "${line}"`);
      }
      i++;
    }

    return { nodes, errors: errors.length > 0 ? errors : undefined };
  }

  private parseCard(
    lines: string[],
    startIndex: number,
    title: string | undefined
  ): { node: MarkdownNode; nextIndex: number } {
    const cardChildren: MarkdownNode[] = [];
    let i = startIndex + 1;
    let depth = 1;

    // Parse card content until we find the matching closing --]
    while (i < lines.length && depth > 0) {
      const cardLine = this.options.preserveWhitespace ? lines[i] : lines[i].trim();

      // Check for card closing
      if (cardLine === "--]") {
        depth--;
        if (depth === 0) {
          break;
        }
      }

      // Check for nested card opening (must be before div check)
      if (cardLine.match(/^\[--\s*(.*)$/)) {
        const nestedTitle = cardLine.match(/^\[--\s*(.*)$/)?.[1] || undefined;
        const result = this.parseCard(lines, i, nestedTitle);
        cardChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for nested grid opening
      if (cardLine.match(/^\[grid\s+(.*)$/)) {
        const nestedConfig = cardLine.match(/^\[grid\s+(.*)$/)?.[1] || '';
        const result = this.parseContainer(lines, i, 'grid', nestedConfig);
        cardChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for nested div opening
      if (cardLine.match(/^\[\s*(.*)$/) && !cardLine.includes("]")) {
        const nestedConfig = cardLine.match(/^\[\s*(.*)$/)?.[1] || '';
        const result = this.parseContainer(lines, i, 'div', nestedConfig);
        cardChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      if (cardLine) {
        const childNode = this.parseLine(cardLine);
        if (childNode) {
          cardChildren.push(childNode);
        }
      }
      i++;
    }

    return {
      node: {
        type: "card",
        titleChildren: title ? this.parseInlineEmphasis(title) : undefined,
        children: cardChildren,
      },
      nextIndex: i + 1,
    };
  }

  private parseContainer(
    lines: string[],
    startIndex: number,
    type: 'grid' | 'div',
    config: string
  ): { node: MarkdownNode; nextIndex: number } {
    const containerChildren: MarkdownNode[] = [];
    let i = startIndex + 1;
    let depth = 1;

    // Parse container content until we find the matching closing ]
    while (i < lines.length && depth > 0) {
      const containerLine = this.options.preserveWhitespace ? lines[i] : lines[i].trim();

      // Check for container closing
      if (containerLine === "]") {
        depth--;
        if (depth === 0) {
          break;
        }
      }

      // Check for nested card opening (must be before div check)
      if (containerLine.match(/^\[--\s*(.*)$/)) {
        const nestedTitle = containerLine.match(/^\[--\s*(.*)$/)?.[1] || undefined;
        const result = this.parseCard(lines, i, nestedTitle);
        containerChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for nested grid opening
      if (containerLine.match(/^\[grid\s+(.*)$/)) {
        const nestedConfig = containerLine.match(/^\[grid\s+(.*)$/)?.[1] || '';
        const result = this.parseContainer(lines, i, 'grid', nestedConfig);
        containerChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      // Check for nested div opening
      if (containerLine.match(/^\[\s*(.*)$/) && !containerLine.includes("]")) {
        const nestedConfig = containerLine.match(/^\[\s*(.*)$/)?.[1] || '';
        const result = this.parseContainer(lines, i, 'div', nestedConfig);
        containerChildren.push(result.node);
        i = result.nextIndex;
        continue;
      }

      if (containerLine) {
        const childNode = this.parseLine(containerLine);
        if (childNode) {
          containerChildren.push(childNode);
        }
      }
      i++;
    }

    const node: MarkdownNode = {
      type,
      children: containerChildren,
    };

    if (type === 'grid') {
      node.gridConfig = config;
    } else if (type === 'div' && config) {
      node.className = config;
    }

    return {
      node,
      nextIndex: i + 1,
    };
  }

  private parseLine(line: string): MarkdownNode | null {
    // Parse headers (# H1, ## H2, etc.)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      return {
        type: "header",
        level: headerMatch[1].length,
        children: this.parseInlineEmphasis(headerMatch[2]),
      };
    }

    // Parse multiple form fields on one line (inputs, textareas, dropdowns, checkboxes)
    // This must be checked BEFORE single field patterns
    const fieldPattern = /(.+?)\s+(___|\|___\||__\*|__>(?:\s*\[[^\]]+\])?|__\[\])/g;
    const fieldMatches = [...line.matchAll(fieldPattern)];

    if (fieldMatches.length > 1) {
      return {
        type: "container",
        children: fieldMatches.map((match) => {
          const label = match[1].trim();
          const marker = match[2];

          if (marker === '__*') {
            return {
              type: "input",
              label,
              inputType: "password",
            } as MarkdownNode;
          } else if (marker === '|___|') {
            return {
              type: "textarea",
              label,
            } as MarkdownNode;
          } else if (marker === '__[]') {
            return {
              type: "checkbox",
              label,
            } as MarkdownNode;
          } else if (marker.startsWith('__>')) {
            // Handle dropdown with or without options
            const optionsMatch = marker.match(/\[([^\]]+)\]/);
            if (optionsMatch) {
              const options = optionsMatch[1]
                .split(",")
                .map((opt) => opt.trim())
                .filter((opt) => opt.length > 0);
              return {
                type: "dropdown",
                label,
                options,
              } as MarkdownNode;
            } else {
              return {
                type: "dropdown",
                label,
              } as MarkdownNode;
            }
          } else { // ___
            return {
              type: "input",
              label,
              inputType: "text",
            } as MarkdownNode;
          }
        }),
      };
    }

    // Parse password inputs (Label __*)
    const passwordMatch = line.match(/^(.+?)\s+__\*$/);
    if (passwordMatch) {
      return {
        type: "input",
        label: passwordMatch[1],
        inputType: "password",
      };
    }

    // Parse textarea (Label |___|)
    const textareaMatch = line.match(/^(.+?)\s+\|___\|$/);
    if (textareaMatch) {
      return {
        type: "textarea",
        label: textareaMatch[1],
      };
    }

    // Parse text inputs (Label ___)
    const inputMatch = line.match(/^(.+?)\s+___$/);
    if (inputMatch) {
      return {
        type: "input",
        label: inputMatch[1],
        inputType: "text",
      };
    }

    // Parse checkbox (Label __[])
    const checkboxMatch = line.match(/^(.+?)\s+__\[\]$/);
    if (checkboxMatch) {
      return {
        type: "checkbox",
        label: checkboxMatch[1],
      };
    }

    // Parse radio group (Label __() [option1, option2, option3])
    const radioGroupMatch = line.match(/^(.+?)\s+__\(\)\s+\[(.+?)\]$/);
    if (radioGroupMatch) {
      const options = radioGroupMatch[2]
        .split(",")
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);
      return {
        type: "radiogroup",
        label: radioGroupMatch[1],
        options,
      };
    }

    // Parse dropdowns with options (Label __> [option1, option2, option3])
    const dropdownWithOptionsMatch = line.match(/^(.+?)\s+__>\s+\[(.+?)\]$/);
    if (dropdownWithOptionsMatch) {
      const options = dropdownWithOptionsMatch[2]
        .split(",")
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);
      return {
        type: "dropdown",
        label: dropdownWithOptionsMatch[1],
        options,
      };
    }

    // Parse dropdowns without options (Label __>)
    const dropdownMatch = line.match(/^(.+?)\s+__>$/);
    if (dropdownMatch) {
      return {
        type: "dropdown",
        label: dropdownMatch[1],
      };
    }

    // Parse image (![alt text](url))
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      return {
        type: "image",
        alt: imageMatch[1],
        src: imageMatch[2],
      };
    }

    // Parse multiple buttons on one line ([btn1][(btn2)])
    const multiButtonMatch = line.match(/^(\[\(?[^\[\]|]+\)?\]\s*)+$/);
    if (multiButtonMatch) {
      const buttons = line.match(/\[(\(?)[^\[\]|]+?(\)?)\]/g);
      if (buttons && buttons.length > 1) {
        return {
          type: "container",
          children: buttons.map((btn) => {
            const innerMatch = btn.match(/\[(\(?)(.+?)(\)?)\]/);
            if (innerMatch) {
              const isDefault = innerMatch[1] === "(" && innerMatch[3] === ")";
              const content = innerMatch[2];

              return {
                type: "button",
                content,
                variant: isDefault ? "default" : "outline",
              };
            }
            return {
              type: "button",
              content: btn.slice(1, -1),
              variant: "outline",
            };
          }),
        };
      }
    }

    // Parse default button [(button text)] or [(button text) | classes]
    const defaultButtonMatch = line.match(/^\[\((.+?)\)(?:\s*\|\s*(.+))?\]$/);
    if (defaultButtonMatch) {
      const content = defaultButtonMatch[1];
      const className = defaultButtonMatch[2]?.trim();

      return {
        type: "button",
        content,
        variant: "default",
        ...(className && { className }),
      };
    }

    // Parse outline button [button text] or [button text | classes]
    const buttonMatch = line.match(/^\[([^|]+?)(?:\s*\|\s*(.+))?\]$/);
    if (buttonMatch) {
      const content = buttonMatch[1].trim();
      const className = buttonMatch[2]?.trim();

      return {
        type: "button",
        content,
        variant: "outline",
        ...(className && { className }),
      };
    }

    // Plain text
    return {
      type: "text",
      children: this.parseInlineEmphasis(line),
    };
  }

  private parseInlineEmphasis(text: string): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];
    let remaining = text;
    let position = 0;

    while (position < remaining.length) {
      // Try to match bold-italic (_*text*_)
      const boldItalicMatch = remaining
        .slice(position)
        .match(/^_\*(.+?)\*_/);
      if (boldItalicMatch) {
        const content = boldItalicMatch[1];
        nodes.push({
          type: "bold",
          children: [{ type: "italic", content }],
        });
        position += boldItalicMatch[0].length;
        continue;
      }

      // Try to match bold (*text*)
      const boldMatch = remaining.slice(position).match(/^\*(.+?)\*/);
      if (boldMatch) {
        nodes.push({
          type: "bold",
          content: boldMatch[1],
        });
        position += boldMatch[0].length;
        continue;
      }

      // Try to match italic (_text_)
      const italicMatch = remaining.slice(position).match(/^_(.+?)_/);
      if (italicMatch) {
        nodes.push({
          type: "italic",
          content: italicMatch[1],
        });
        position += italicMatch[0].length;
        continue;
      }

      // No emphasis found, consume until next emphasis marker or end of string
      const nextAsterisk = remaining.slice(position).indexOf("*");
      const nextUnderscore = remaining.slice(position).indexOf("_");

      // Find the nearest marker
      let nextMarker = -1;
      if (nextAsterisk !== -1 && nextUnderscore !== -1) {
        nextMarker = Math.min(nextAsterisk, nextUnderscore);
      } else if (nextAsterisk !== -1) {
        nextMarker = nextAsterisk;
      } else if (nextUnderscore !== -1) {
        nextMarker = nextUnderscore;
      }

      const textEnd =
        nextMarker === -1
          ? remaining.length
          : position + nextMarker;

      if (textEnd > position) {
        nodes.push({
          type: "text",
          content: remaining.slice(position, textEnd),
        });
        position = textEnd;
      } else {
        // Edge case: marker that doesn't form emphasis
        nodes.push({
          type: "text",
          content: remaining.slice(position, position + 1),
        });
        position++;
      }
    }

    return nodes;
  }
}
