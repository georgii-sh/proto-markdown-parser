# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-01-02

### Added

- Support for tables inside cards, divs, grids, and screens
- New `parseTable` helper method for reusable table parsing logic

### Example

Tables can now be nested inside container elements:

```
[-- Shopping Cart
  # Your Cart

  | Product | Qty | Price |
  |---------|-----|-------|
  | Widget  | 1   | $10   |

  [(Checkout)]
--]
```

## [1.0.2] - Previous Release

- Initial stable release with MarkdownParser, ShadcnCodeGenerator, and HtmlGenerator
