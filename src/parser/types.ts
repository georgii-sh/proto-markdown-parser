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

export interface MarkdownNode {
  type: NodeType;
  id?: string; // for elements, screens
  content?: string; // for text, buttons, headers, bold, italic
  level?: number; // for headers
  label?: string; // for inputs/dropdowns/textarea
  options?: string[]; // for dropdowns
  inputType?: 'text' | 'password'; // for inputs
  variant?: 'default' | 'outline'; // for buttons
  navigateTo?: string; // for buttons with navigation (target screen ID)
  title?: string; // for cards (plain text, deprecated in favor of titleChildren)
  titleChildren?: MarkdownNode[]; // for cards (with inline emphasis)
  headers?: string[]; // for tables
  rows?: string[][]; // for tables
  gridConfig?: string; // for grid (e.g., "cols-2 gap-4")
  className?: string; // for div and button (custom Tailwind classes)
  src?: string; // for images (URL)
  alt?: string; // for images (alt text)
  initialScreen?: string; // for workflow (ID of the starting screen)
  children?: MarkdownNode[]; // for containers, cards, grids, divs, text (inline emphasis), bold, italic, workflows, screens
  metadata?: Record<string, any>;
}

export interface ParserOptions {
  strict?: boolean;
  preserveWhitespace?: boolean;
}

export interface ParseResult {
  nodes: MarkdownNode[];
  errors?: string[];
}
