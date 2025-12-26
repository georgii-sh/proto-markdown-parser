# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library that parses Proto Markdown syntax (a UI prototyping markdown language from protomarkdown.org) and generates code output. The library provides three main classes:

- **MarkdownParser**: Parses Proto Markdown syntax into an Abstract Syntax Tree (AST)
- **ShadcnCodeGenerator**: Converts the AST into React component code using Shadcn UI components
- **HtmlGenerator**: Converts the AST into HTML for preview rendering (used by VS Code extension)

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

1. **Top-level parsing** (`parse` method): Processes markdown line by line, identifying workflows, tables, cards, grids, divs, and inline elements
2. **Recursive parsers**:
   - `parseWorkflow` handles workflow syntax (`[workflow` to `]`) and orchestrates screen parsing
   - `parseScreen` handles screen syntax (`[screen id` to `]`) within workflows
   - `parseCard` handles card syntax (`[--` to `--]`) with depth tracking for nested cards
   - `parseContainer` handles both grid (`[grid ...`) and div (`[`) syntax with depth tracking
   - `parseLine` handles inline elements (headers, inputs, buttons with navigation, text, etc.)
   - `parseInlineEmphasis` handles text formatting (bold `*text*`, italic `_text_`, bold-italic `_*text*_`)

3. **Multi-element detection**: The parser detects multiple form fields or buttons on a single line and wraps them in a container node

4. **Navigation detection**: Buttons can include navigation targets using `-> screenId` syntax, enabling screen-to-screen transitions in workflows

### Node Types (`src/parser/types.ts`)

The AST uses a union type system with a single `MarkdownNode` interface containing optional fields for different node types. Key node types:
- Workflow nodes: `workflow` (contains screens, tracks `initialScreen`), `screen` (contains UI elements, has unique `id`)
- Container nodes: `card`, `container`, `grid`, `div` (all have `children` arrays)
- Form elements: `input`, `textarea`, `dropdown`, `checkbox`, `radiogroup`
- Content elements: `header`, `text`, `button` (can have `navigateTo` for screen transitions), `image`, `table`
- Inline formatting: `bold`, `italic` (can nest via `children`)

### Code Generator Architecture (`src/ShadcnCodeGenerator.ts`)

The code generator recursively traverses the AST and:
1. Tracks required Shadcn UI component imports in `requiredImports` Set
2. Manages indentation levels for proper JSX nesting
3. Generates a complete React component with imports and proper formatting
4. Escapes JSX special characters in user content
5. For workflows: Generates `useState` hook for screen management and conditional rendering logic

The generator handles inline nodes differently from block nodes, using `generateInlineNode` for text content within headers, bold, and italic elements.

**Workflow Generation**: When a `workflow` node is encountered, the generator creates:
- A `useState` hook to manage `currentScreen` state
- Conditional rendering (if/else chain) for each screen
- `onClick` handlers on navigation buttons that call `setCurrentScreen(targetId)`
- An IIFE wrapper to encapsulate the state and logic

### HTML Generator Architecture (`src/HtmlGenerator.ts`)

The HTML generator produces static HTML with CSS classes prefixed with `proto-` for styling. It:
1. Recursively renders each node type to HTML strings
2. Handles inline nodes separately via `renderInlineNode` for text formatting
3. Parses grid config (e.g., `cols-2 gap-4`) into CSS grid styles
4. Escapes HTML special characters in user content
5. For workflows: Renders all screens with `data-screen-id` attributes and marks the initial screen as active

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

# Buttons with navigation (for workflows)
[(Next) -> step2]
[Back -> step1]

# Tables
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |

# Workflows with multi-screen navigation
[workflow
  [screen welcome
    # Welcome
    [(Get Started) -> login]
  ]
  [screen login
    # Login
    Email ___
    Password __*
    [(Login) -> dashboard]
    [Back -> welcome]
  ]
  [screen dashboard
    # Dashboard
    Welcome to your dashboard!
    [Logout -> welcome]
  ]
]
```

## Package Configuration

- Entry points: `src/index.ts` exports `MarkdownParser`, `ShadcnCodeGenerator`, and `HtmlGenerator`
- Build output: Dual CJS (`dist/index.js`) and ESM (`dist/index.esm.js`) bundles with TypeScript declarations
- Module system: ESNext with ES2020 target
- Bundler: Rollup with TypeScript plugin
