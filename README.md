# @protomarkdown/parser

Parser and renderer for Proto Markdown syntax - A UI prototyping markdown language for rapid React component generation.

[Proto Markdown Syntax Documentation](https://www.protomarkdown.org/documentation)

## Features

- 🎨 Parse Proto Markdown syntax into an Abstract Syntax Tree (AST)
- ⚛️ Generate React components with Shadcn UI
- 🔄 Multi-screen workflow navigation system
- 📋 Form elements (inputs, dropdowns, checkboxes, textareas)
- 🎯 Cards, grids, and flexible layouts
- 📊 Tables and data display
- ✨ Text formatting (bold, italic)

## Installation

```bash
npm install @protomarkdown/parser
```

## Quick Start

```ts
import { MarkdownParser, ShadcnCodeGenerator } from "@protomarkdown/parser";

const parser = new MarkdownParser();
const codeGenerator = new ShadcnCodeGenerator();

const markdown = `
[-- Hello, world!
Email ___
Password __*
[(submit)][cancel]
--]`;

const ast = parser.parse(markdown);
const code = codeGenerator.generate(ast.nodes);
```

## Workflows - Multi-Screen Navigation

Create complete multi-screen workflows with clickable navigation between screens:

```ts
const workflowMarkdown = `
[workflow
  [screen welcome
    # Welcome to My App
    Get started with your journey!
    [(Get Started) -> login]
    [Skip to Dashboard -> dashboard]
  ]

  [screen login
    # Login
    Email ___
    Password __*
    Remember me __[]
    [(Login) -> dashboard]
    [Back -> welcome]
  ]

  [screen dashboard
    # Dashboard
    Welcome to your dashboard!

    [grid cols-2 gap-4
      [-- Stats
        Total Users: 150
      --]
      [-- Activity
        Recent activity here
      --]
    ]

    [Logout -> welcome]
  ]
]`;

const ast = parser.parse(workflowMarkdown);
const reactCode = codeGenerator.generate(ast.nodes);
```

### Button Navigation Syntax

- **Default button with navigation:** `[(Button Text) -> targetScreen]`
- **Outline button with navigation:** `[Button Text -> targetScreen]`
- **Multiple navigation buttons:** `[(Next) -> step2][Back -> step1]`

The generated component includes:
- `useState` hook for screen state management
- Conditional rendering of screens
- `onClick` handlers for seamless navigation

## Supported Elements

### Form Fields

```markdown
Email ___                              # Text input
Password __*                           # Password input
Description |___|                      # Textarea
Country __> [USA, Canada, Mexico]      # Dropdown with options
Remember me __[]                       # Checkbox
Gender __() [Male, Female, Other]      # Radio group
```

### Layouts

```markdown
[-- Card Title                         # Card
Content here
--]

[grid cols-2 gap-4                     # Grid layout
  [-- Card 1 --]
  [-- Card 2 --]
]

[ flex gap-2                           # Custom div with classes
  Content
]
```

### Buttons

```markdown
[(Submit)]                             # Default button
[Cancel]                               # Outline button
[(Save)][Reset]                        # Multiple buttons
[(Next) -> step2]                      # Navigation button (workflows)
```

### Tables

```markdown
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |
```

### Text Formatting

```markdown
This is *bold* text
This is _italic_ text
This is _*bold and italic*_ text
```

## API Reference

### MarkdownParser

```ts
const parser = new MarkdownParser(options?: ParserOptions);
const result = parser.parse(markdown: string);
```

**Options:**
- `strict?: boolean` - Enable strict parsing mode
- `preserveWhitespace?: boolean` - Preserve leading/trailing whitespace

**Returns:** `ParseResult` containing `nodes` (AST) and optional `errors`

### ShadcnCodeGenerator

```ts
const generator = new ShadcnCodeGenerator();
const code = generator.generate(nodes: MarkdownNode[]);
```

**Returns:** Complete React component code as a string with necessary Shadcn UI imports

## Examples

### Login Form

```markdown
[-- Login
  # Welcome Back
  Email ___
  Password __*
  Remember me __[]
  [(Login)][Forgot Password]
--]
```

### Multi-Step Form Workflow

```markdown
[workflow
  [screen step1
    # Step 1: Personal Info
    First Name ___ Last Name ___
    Email ___
    [(Next) -> step2]
  ]
  [screen step2
    # Step 2: Address
    Street ___
    City ___ State ___
    [(Back) -> step1][(Next) -> step3]
  ]
  [screen step3
    # Step 3: Review
    Please review your information
    [(Submit) -> confirmation][(Back) -> step2]
  ]
  [screen confirmation
    # Success!
    Your form has been submitted.
    [Start Over -> step1]
  ]
]
```

## Testing

```bash
npm test          # Run all tests
npm run build     # Build the library
```

## License

Apache-2.0

## Links

- [Proto Markdown Documentation](https://www.protomarkdown.org/documentation)
- [GitHub Repository](https://github.com/georgii-sh/proto-markdown-parser)
- [Shadcn UI](https://ui.shadcn.com/)