import type { Renderer } from "../renderer/types";

/**
 * The HTML renderer has no cross-render state — it emits self-contained
 * HTML fragments, one per node, joined with newlines by the walker.
 */
export type HtmlState = void;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseGridConfig(config: string): string {
  const styles: string[] = [];
  const colsMatch = config.match(/cols-(\d+)/);
  if (colsMatch) {
    styles.push(`grid-template-columns: repeat(${colsMatch[1]}, 1fr)`);
  }
  const gapMatch = config.match(/gap-(\d+)/);
  if (gapMatch) {
    styles.push(`gap: ${parseInt(gapMatch[1]) * 4}px`);
  }
  return styles.join("; ");
}

// The HTML renderer ignores `ctx.indent`: v1 `HtmlGenerator` emits literal
// whitespace inside template literals rather than computing per-depth indent.
// To preserve byte-equality, every handler reproduces those template strings
// verbatim.
export const htmlRenderer: Renderer<HtmlState> = {
  name: "html",
  escape: escapeHtml,

  nodes: {
    header: (node, ctx) => {
      const content = ctx.renderChildren(node.children, { inline: true });
      return `<h${node.level} class="proto-header">${content}</h${node.level}>`;
    },

    text: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<p class="proto-text">${content}</p>`;
    },

    bold: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<strong>${content}</strong>`;
    },

    italic: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<em>${content}</em>`;
    },

    input: (node, ctx) => {
      const placeholder = node.inputType === "password" ? "••••••••" : "";
      return `
      <div class="proto-field">
        <label class="proto-label">${ctx.escape(node.label)}</label>
        <input type="${
          node.inputType
        }" class="proto-input" placeholder="${placeholder}" disabled />
      </div>`;
    },

    textarea: (node, ctx) => `
      <div class="proto-field">
        <label class="proto-label">${ctx.escape(node.label)}</label>
        <textarea class="proto-textarea" disabled></textarea>
      </div>`,

    checkbox: (node, ctx) => `
      <div class="proto-checkbox">
        <input type="checkbox" class="proto-checkbox-input" disabled />
        <label class="proto-checkbox-label">${ctx.escape(node.label)}</label>
      </div>`,

    radiogroup: (node, ctx) => {
      const options = node.options
        .map(
          (opt) => `
        <div class="proto-radio-option">
          <input type="radio" class="proto-radio-input" name="${ctx.escape(
            node.label,
          )}" disabled />
          <label class="proto-radio-label">${ctx.escape(opt)}</label>
        </div>`,
        )
        .join("");
      return `
      <div class="proto-radiogroup">
        <label class="proto-label">${ctx.escape(node.label)}</label>
        <div class="proto-radio-options">${options}</div>
      </div>`;
    },

    dropdown: (node, ctx) => {
      const options = (node.options ?? ["Select an option"])
        .map((opt) => `<option>${ctx.escape(opt)}</option>`)
        .join("");
      return `
      <div class="proto-field">
        <label class="proto-label">${ctx.escape(node.label)}</label>
        <select class="proto-select" disabled>${options}</select>
      </div>`;
    },

    button: (node, ctx) => {
      const btnClass =
        node.variant === "default"
          ? "proto-button-default"
          : "proto-button-outline";
      const navIndicator = node.navigateTo
        ? ` <span class="proto-nav-indicator">→ ${ctx.escape(node.navigateTo)}</span>`
        : "";
      return `<button class="proto-button ${btnClass}" disabled>${ctx.escape(node.content)}${navIndicator}</button>`;
    },

    card: (node, ctx) => {
      const cardTitle =
        node.titleChildren && node.titleChildren.length > 0
          ? `<div class="proto-card-header">${ctx.renderChildren(
              node.titleChildren,
              { inline: true },
            )}</div>`
          : "";
      const cardChildren = ctx.renderChildren(node.children);
      return `
      <div class="proto-card">
        ${cardTitle}
        <div class="proto-card-content">${cardChildren}</div>
      </div>`;
    },

    container: (node, ctx) => {
      const children = ctx.renderChildren(node.children);
      return `<div class="proto-container">${children}</div>`;
    },

    grid: (node, ctx) => {
      const children = ctx.renderChildren(node.children);
      const gridConfig = parseGridConfig(node.gridConfig);
      return `<div class="proto-grid" style="${gridConfig}">${children}</div>`;
    },

    div: (node, ctx) => {
      const children = ctx.renderChildren(node.children);
      return `<div class="proto-div ${ctx.escape(node.className ?? "")}">${children}</div>`;
    },

    table: (node, ctx) => {
      const headerCells = node.headers
        .map((h) => `<th class="proto-table-th">${ctx.escape(h)}</th>`)
        .join("");
      const bodyRows = node.rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td class="proto-table-td">${ctx.escape(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");
      return `
      <table class="proto-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    },

    image: (node, ctx) =>
      `<img class="proto-image" src="${ctx.escape(node.src)}" alt="${ctx.escape(node.alt)}" />`,

    workflow: (node, ctx) => {
      const screens = node.children
        .map((screen, idx) => {
          const isInitial =
            screen.id === node.initialScreen || idx === 0;
          const screenContent = ctx.renderChildren(screen.children);
          return `
          <div class="proto-screen${
            isInitial ? " proto-screen-active" : ""
          }" data-screen-id="${ctx.escape(screen.id)}">
            <div class="proto-screen-header">
              <span class="proto-screen-badge">${ctx.escape(screen.id)}</span>
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
    },

    screen: (node, ctx) => {
      const screenChildren = ctx.renderChildren(node.children);
      return `
      <div class="proto-screen" data-screen-id="${ctx.escape(node.id)}">
        <div class="proto-screen-header">
          <span class="proto-screen-badge">${ctx.escape(node.id)}</span>
        </div>
        <div class="proto-screen-content">${screenChildren}</div>
      </div>`;
    },
  },

  inline: {
    bold: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<strong>${content}</strong>`;
    },

    italic: (node, ctx) => {
      const content =
        node.children && node.children.length > 0
          ? ctx.renderChildren(node.children, { inline: true })
          : ctx.escape(node.content ?? "");
      return `<em>${content}</em>`;
    },
  },
};
