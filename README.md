# proto-markdown-parser

Parser and rendeder for proto markdown syntax

[Proto Markdown Syntax Documentation](https://www.protomarkdown.org/documentation)

## Usage

```ts
import { MarkdownParser } from "@protomarkdown/parser";
import { ShadcnCodeGenerator } from "@protomarkdown/parser";

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