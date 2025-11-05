# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library that parses Proto Markdown syntax (a UI prototyping markdown language from protomarkdown.org) and generates React components using Shadcn UI. The library provides two main classes:

- **MarkdownParser**: Parses Proto Markdown syntax into an Abstract Syntax Tree (AST)
- **ShadcnCodeGenerator**: Converts the AST into React component code using Shadcn UI components

## Build and Test Commands

```bash
# Build the library (generates CJS and ESM bundles)
npm run build

# Run tests
npm test

# Build before publishing (runs automatically)
npm run prepublishOnly
```

## Architecture

### Parser Architecture (`src/parser/MarkdownParser.ts`)

The parser uses a line-based parsing approach with recursive descent for nested structures:

1. **Top-level parsing** (`parse` method): Processes markdown line by line, identifying tables, cards, grids, divs, and inline elements
2. **Recursive parsers**:
   - `parseCard` handles card syntax (`[--` to `--]`) with depth tracking for nested cards
   - `parseContainer` handles both grid (`[grid ...`) and div (`[`) syntax with depth tracking
   - `parseLine` handles inline elements (headers, inputs, buttons, text, etc.)
   - `parseInlineEmphasis` handles text formatting (bold `*text*`, italic `_text_`, bold-italic `_*text*_`)

3. **Multi-element detection**: The parser detects multiple form fields or buttons on a single line and wraps them in a container node

### Node Types (`src/parser/types.ts`)

The AST uses a union type system with a single `MarkdownNode` interface containing optional fields for different node types. Key node types:
- Container nodes: `card`, `container`, `grid`, `div` (all have `children` arrays)
- Form elements: `input`, `textarea`, `dropdown`, `checkbox`, `radiogroup`
- Content elements: `header`, `text`, `button`, `image`, `table`
- Inline formatting: `bold`, `italic` (can nest via `children`)

### Code Generator Architecture (`src/ShadcnCodeGenerator.ts`)

The code generator recursively traverses the AST and:
1. Tracks required Shadcn UI component imports in `requiredImports` Set
2. Manages indentation levels for proper JSX nesting
3. Generates a complete React component with imports and proper formatting
4. Escapes JSX special characters in user content

The generator handles inline nodes differently from block nodes, using `generateInlineNode` for text content within headers, bold, and italic elements.

## Key Implementation Details

### Parser Edge Cases

- **Depth tracking**: Cards, grids, and divs track nesting depth to correctly match opening and closing delimiters
- **Order-dependent parsing**: Card syntax must be checked before div syntax (since cards start with `[`)
- **Multi-field lines**: The parser checks for multiple fields before single fields to avoid partial matches

### Indentation Strategy

The code generator uses a two-part indentation system:
- Dynamic indentation via `indentLevel` for nested structures
- Base 6-space indentation added to all generated code to fit within the component return statement

### Import Management

The generator uses a Set to track which Shadcn UI components are used, then generates only the necessary import statements at the top of the file.

## Common Proto Markdown Patterns

```
# Headers with emphasis
## This is *bold* and _italic_

# Form fields
Email ___
Password __*
Description |___|
Country __> [USA, Canada, Mexico]
Remember me __[]

# Cards with nesting
[-- Card Title
Content here
--]

# Grids
[grid cols-2 gap-4
  [-- Card 1 --]
  [-- Card 2 --]
]

# Buttons
[(Submit)][Cancel]

# Tables
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
```

## Package Configuration

- Entry points: `src/index.ts` exports both `MarkdownParser` and `ShadcnCodeGenerator`
- Build output: Dual CJS (`dist/index.js`) and ESM (`dist/index.esm.js`) bundles with TypeScript declarations
- Module system: ESNext with ES2020 target
- Bundler: Rollup with TypeScript plugin
