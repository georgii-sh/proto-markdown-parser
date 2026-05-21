export type NodeType =
  | 'header'
  | 'input'
  | 'textarea'
  | 'dropdown'
  | 'button'
  | 'text'
  | 'container'
  | 'card'
  | 'table'
  | 'checkbox'
  | 'radiogroup'
  | 'grid'
  | 'div'
  | 'bold'
  | 'italic'
  | 'image'
  | 'workflow'
  | 'screen';

export interface HeaderNode {
  type: 'header';
  level: number; // 1..6
  children: MarkdownNode[]; // always built via parseInlineEmphasis
}

export interface InputNode {
  type: 'input';
  label: string;
  inputType: 'text' | 'password';
  id?: string;
}

export interface TextareaNode {
  type: 'textarea';
  label: string;
  id?: string;
}

export interface DropdownNode {
  type: 'dropdown';
  label: string;
  options?: string[]; // absent when the source omits `[...]`
  id?: string;
}

export interface CheckboxNode {
  type: 'checkbox';
  label: string;
  id?: string;
}

export interface RadioGroupNode {
  type: 'radiogroup';
  label: string;
  options: string[];
  id?: string;
}

export interface ButtonNode {
  type: 'button';
  content: string;
  variant: 'default' | 'outline';
  navigateTo?: string; // target screen id; only meaningful inside a workflow
  className?: string;  // custom Tailwind classes via `| classes` suffix
}

/**
 * Text node — bifurcates between a leaf (inline emphasis fragment with `content`)
 * and a block (top-level paragraph with `children` produced by parseInlineEmphasis).
 * Both forms are tagged 'text'; downstream consumers branch on which field is set.
 * Phase 1 (renderer plugin) may unify these in a follow-up.
 */
export interface TextNode {
  type: 'text';
  content?: string;
  children?: MarkdownNode[];
}

export interface ContainerNode {
  type: 'container';
  children: MarkdownNode[];
}

export interface CardNode {
  type: 'card';
  titleChildren?: MarkdownNode[]; // inline-emphasis nodes for the card title; absent for untitled cards
  children: MarkdownNode[];
}

export interface TableNode {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface GridNode {
  type: 'grid';
  gridConfig: string; // e.g. "cols-2 gap-4"
  children: MarkdownNode[];
}

export interface DivNode {
  type: 'div';
  className?: string;
  children: MarkdownNode[];
}

/** See TextNode for the leaf-vs-nested bifurcation rationale. */
export interface BoldNode {
  type: 'bold';
  content?: string;
  children?: MarkdownNode[];
}

/** See TextNode for the leaf-vs-nested bifurcation rationale. */
export interface ItalicNode {
  type: 'italic';
  content?: string;
  children?: MarkdownNode[];
}

export interface ImageNode {
  type: 'image';
  src: string;
  alt: string;
}

export interface WorkflowNode {
  type: 'workflow';
  initialScreen?: string; // absent only for empty workflows (no screens)
  children: ScreenNode[]; // only screens are valid children of a workflow
}

export interface ScreenNode {
  type: 'screen';
  id: string;
  children: MarkdownNode[];
}

export type MarkdownNode =
  | HeaderNode
  | InputNode
  | TextareaNode
  | DropdownNode
  | CheckboxNode
  | RadioGroupNode
  | ButtonNode
  | TextNode
  | ContainerNode
  | CardNode
  | TableNode
  | GridNode
  | DivNode
  | BoldNode
  | ItalicNode
  | ImageNode
  | WorkflowNode
  | ScreenNode;

export interface ParserOptions {
  strict?: boolean;
  preserveWhitespace?: boolean;
}

export interface ParseResult {
  nodes: MarkdownNode[];
  errors?: string[];
}
