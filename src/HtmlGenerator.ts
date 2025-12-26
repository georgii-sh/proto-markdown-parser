import { MarkdownNode } from "./parser/types";

/**
 * Generates HTML from a Proto Markdown AST
 * Used for VS Code extension preview rendering
 */
export class HtmlGenerator {
  /**
   * Generate HTML from markdown AST
   */
  generate(nodes: MarkdownNode[]): string {
    return nodes.map((node) => this.renderNode(node)).join("\n");
  }

  private renderNode(node: MarkdownNode): string {
    switch (node.type) {
      case "header":
        return this.renderHeader(node);
      case "text":
        return this.renderText(node);
      case "bold":
        return this.renderBold(node);
      case "italic":
        return this.renderItalic(node);
      case "input":
        return this.renderInput(node);
      case "textarea":
        return this.renderTextarea(node);
      case "checkbox":
        return this.renderCheckbox(node);
      case "radiogroup":
        return this.renderRadioGroup(node);
      case "dropdown":
        return this.renderDropdown(node);
      case "button":
        return this.renderButton(node);
      case "card":
        return this.renderCard(node);
      case "container":
        return this.renderContainer(node);
      case "grid":
        return this.renderGrid(node);
      case "div":
        return this.renderDiv(node);
      case "table":
        return this.renderTable(node);
      case "image":
        return this.renderImage(node);
      case "workflow":
        return this.renderWorkflow(node);
      case "screen":
        return this.renderScreen(node);
      default:
        return `<div class="proto-unknown">${JSON.stringify(node)}</div>`;
    }
  }

  private renderHeader(node: MarkdownNode): string {
    const level = node.level || 1;
    let content: string;

    if (node.children && node.children.length > 0) {
      content = this.renderInlineNodes(node.children);
    } else {
      content = this.escapeHtml(node.content || "");
    }

    return `<h${level} class="proto-header">${content}</h${level}>`;
  }

  private renderText(node: MarkdownNode): string {
    if (node.children && node.children.length > 0) {
      const content = this.renderInlineNodes(node.children);
      return `<p class="proto-text">${content}</p>`;
    }
    return `<p class="proto-text">${this.escapeHtml(node.content || "")}</p>`;
  }

  private renderBold(node: MarkdownNode): string {
    if (node.children && node.children.length > 0) {
      return `<strong>${this.renderInlineNodes(node.children)}</strong>`;
    }
    return `<strong>${this.escapeHtml(node.content || "")}</strong>`;
  }

  private renderItalic(node: MarkdownNode): string {
    if (node.children && node.children.length > 0) {
      return `<em>${this.renderInlineNodes(node.children)}</em>`;
    }
    return `<em>${this.escapeHtml(node.content || "")}</em>`;
  }

  private renderInlineNodes(nodes: MarkdownNode[]): string {
    return nodes.map((node) => this.renderInlineNode(node)).join("");
  }

  private renderInlineNode(node: MarkdownNode): string {
    switch (node.type) {
      case "bold":
        if (node.children && node.children.length > 0) {
          return `<strong>${this.renderInlineNodes(node.children)}</strong>`;
        }
        return `<strong>${this.escapeHtml(node.content || "")}</strong>`;
      case "italic":
        if (node.children && node.children.length > 0) {
          return `<em>${this.renderInlineNodes(node.children)}</em>`;
        }
        return `<em>${this.escapeHtml(node.content || "")}</em>`;
      case "text":
        if (node.children && node.children.length > 0) {
          return this.renderInlineNodes(node.children);
        }
        return this.escapeHtml(node.content || "");
      default:
        return this.escapeHtml(node.content || "");
    }
  }

  private renderInput(node: MarkdownNode): string {
    const placeholder = node.inputType === "password" ? "••••••••" : "";
    return `
      <div class="proto-field">
        <label class="proto-label">${this.escapeHtml(node.label || "")}</label>
        <input type="${
          node.inputType || "text"
        }" class="proto-input" placeholder="${placeholder}" disabled />
      </div>`;
  }

  private renderTextarea(node: MarkdownNode): string {
    return `
      <div class="proto-field">
        <label class="proto-label">${this.escapeHtml(node.label || "")}</label>
        <textarea class="proto-textarea" disabled></textarea>
      </div>`;
  }

  private renderCheckbox(node: MarkdownNode): string {
    return `
      <div class="proto-checkbox">
        <input type="checkbox" class="proto-checkbox-input" disabled />
        <label class="proto-checkbox-label">${this.escapeHtml(
          node.label || ""
        )}</label>
      </div>`;
  }

  private renderRadioGroup(node: MarkdownNode): string {
    const options = (node.options || [])
      .map(
        (opt) => `
        <div class="proto-radio-option">
          <input type="radio" class="proto-radio-input" name="${this.escapeHtml(
            node.label || ""
          )}" disabled />
          <label class="proto-radio-label">${this.escapeHtml(opt)}</label>
        </div>`
      )
      .join("");

    return `
      <div class="proto-radiogroup">
        <label class="proto-label">${this.escapeHtml(node.label || "")}</label>
        <div class="proto-radio-options">${options}</div>
      </div>`;
  }

  private renderDropdown(node: MarkdownNode): string {
    const options = (node.options || ["Select an option"])
      .map((opt) => `<option>${this.escapeHtml(opt)}</option>`)
      .join("");

    return `
      <div class="proto-field">
        <label class="proto-label">${this.escapeHtml(node.label || "")}</label>
        <select class="proto-select" disabled>${options}</select>
      </div>`;
  }

  private renderButton(node: MarkdownNode): string {
    const btnClass =
      node.variant === "default"
        ? "proto-button-default"
        : "proto-button-outline";

    const navIndicator = node.navigateTo
      ? ` <span class="proto-nav-indicator">→ ${this.escapeHtml(
          node.navigateTo
        )}</span>`
      : "";

    return `<button class="proto-button ${btnClass}" disabled>${this.escapeHtml(
      node.content || ""
    )}${navIndicator}</button>`;
  }

  private renderCard(node: MarkdownNode): string {
    let cardTitle = "";

    if (node.titleChildren && node.titleChildren.length > 0) {
      cardTitle = `<div class="proto-card-header">${this.renderInlineNodes(
        node.titleChildren
      )}</div>`;
    } else if (node.title) {
      cardTitle = `<div class="proto-card-header">${this.escapeHtml(
        node.title
      )}</div>`;
    }

    const cardChildren = node.children ? this.generate(node.children) : "";

    return `
      <div class="proto-card">
        ${cardTitle}
        <div class="proto-card-content">${cardChildren}</div>
      </div>`;
  }

  private renderContainer(node: MarkdownNode): string {
    const children = node.children ? this.generate(node.children) : "";
    return `<div class="proto-container">${children}</div>`;
  }

  private renderGrid(node: MarkdownNode): string {
    const children = node.children ? this.generate(node.children) : "";
    const gridConfig = this.parseGridConfig(node.gridConfig || "");
    return `<div class="proto-grid" style="${gridConfig}">${children}</div>`;
  }

  private renderDiv(node: MarkdownNode): string {
    const children = node.children ? this.generate(node.children) : "";
    return `<div class="proto-div ${this.escapeHtml(
      node.className || ""
    )}">${children}</div>`;
  }

  private renderTable(node: MarkdownNode): string {
    const headerCells = (node.headers || [])
      .map((h) => `<th class="proto-table-th">${this.escapeHtml(h)}</th>`)
      .join("");

    const bodyRows = (node.rows || [])
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td class="proto-table-td">${this.escapeHtml(cell)}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    return `
      <table class="proto-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
  }

  private renderImage(node: MarkdownNode): string {
    return `<img class="proto-image" src="${this.escapeHtml(
      node.src || ""
    )}" alt="${this.escapeHtml(node.alt || "")}" />`;
  }

  private renderWorkflow(node: MarkdownNode): string {
    const screens = (node.children || [])
      .map((screen, idx) => {
        const isInitial = screen.id === node.initialScreen || idx === 0;
        const screenContent = screen.children
          ? this.generate(screen.children)
          : "";
        const screenId = screen.id || "";

        return `
          <div class="proto-screen${
            isInitial ? " proto-screen-active" : ""
          }" data-screen-id="${this.escapeHtml(screenId)}">
            <div class="proto-screen-header">
              <span class="proto-screen-badge">${this.escapeHtml(
                screenId
              )}</span>
              ${
                isInitial
                  ? '<span class="proto-screen-initial">Initial</span>'
                  : ""
              }
            </div>
            <div class="proto-screen-content">${screenContent}</div>
          </div>`;
      })
      .join("");

    return `<div class="proto-workflow">${screens}</div>`;
  }

  private renderScreen(node: MarkdownNode): string {
    const screenChildren = node.children ? this.generate(node.children) : "";
    const screenId = node.id || "";

    return `
      <div class="proto-screen" data-screen-id="${this.escapeHtml(screenId)}">
        <div class="proto-screen-header">
          <span class="proto-screen-badge">${this.escapeHtml(screenId)}</span>
        </div>
        <div class="proto-screen-content">${screenChildren}</div>
      </div>`;
  }

  private parseGridConfig(config: string): string {
    const styles: string[] = [];

    // Parse cols-N
    const colsMatch = config.match(/cols-(\d+)/);
    if (colsMatch) {
      styles.push(`grid-template-columns: repeat(${colsMatch[1]}, 1fr)`);
    }

    // Parse gap-N
    const gapMatch = config.match(/gap-(\d+)/);
    if (gapMatch) {
      styles.push(`gap: ${parseInt(gapMatch[1]) * 4}px`);
    }

    return styles.join("; ");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
