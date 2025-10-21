import { MarkdownParser } from './parser';

/**
 * Performance Test Suite for MarkdownParser
 *
 * Tests parsing speed and memory usage across different document sizes and complexity levels.
 *
 * Run with: npm test -- parser.perf.test.ts
 * For detailed timing: npm test -- parser.perf.test.ts --verbose
 */

describe('MarkdownParser Performance Tests', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  // Utility function to measure execution time and log it
  const measureTime = (fn: () => void, label?: string): number => {
    const start = performance.now();
    fn();
    const end = performance.now();
    const duration = end - start;

    if (label) {
      console.log(`  ⏱️  ${label}: ${duration.toFixed(3)}ms`);
    }

    return duration;
  };

  // Utility function to measure memory (approximate)
  const measureMemory = (fn: () => any, label?: string): { result: any; memoryUsed: number } => {
    if (global.gc) {
      global.gc(); // Force garbage collection if available
    }

    const memBefore = process.memoryUsage().heapUsed;
    const result = fn();
    const memAfter = process.memoryUsage().heapUsed;
    const memoryUsed = memAfter - memBefore;

    if (label) {
      const memMB = (memoryUsed / (1024 * 1024)).toFixed(2);
      console.log(`  💾 ${label}: ${memMB} MB`);
    }

    return {
      result,
      memoryUsed,
    };
  };

  // Helper to generate repeated markdown content
  const repeat = (content: string, times: number): string => {
    return Array(times).fill(content).join('\n');
  };

  describe('Small Documents (< 100 lines)', () => {
    test('parses simple form (20 lines) within performance budget', () => {
      const markdown = repeat(`# Registration Form
Email ___
Password __*
Confirm Password __*
Role __> [Admin, User, Guest]
Remember me __[]
[(submit)][cancel]

`, 2);

      const time = measureTime(() => {
        parser.parse(markdown);
      }, 'Simple form (20 lines)');

      // Should parse small documents in under 10ms
      expect(time).toBeLessThan(10);
    });

    test('parses mixed content (50 lines) efficiently', () => {
      const markdown = repeat(`# Section Header
Simple text content
Email ___
Password __*
Status __> [Active, Inactive]
`, 10);

      const { result } = measureMemory(() => parser.parse(markdown), 'Mixed content (50 lines)');

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.errors).toBeUndefined();
    });

    test('parses simple table (15 rows) quickly', () => {
      let markdown = '| Name | Email | Role |\n|------|-------|------|\n';
      for (let i = 0; i < 15; i++) {
        markdown += `| User${i} | user${i}@example.com | Admin |\n`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      }, 'Simple table (15 rows)');

      expect(time).toBeLessThan(5);
    });

    test('parses card with inputs (25 lines) within budget', () => {
      const markdown = repeat(`[-- User Information
First Name ___
Last Name ___
Email ___
Phone ___
Address ___
--]

`, 3);

      const time = measureTime(() => {
        parser.parse(markdown);
      }, 'Card with inputs (25 lines)');

      expect(time).toBeLessThan(10);
    });
  });

  describe('Medium Documents (100-1000 lines)', () => {
    test('parses 100-line form with multiple sections', () => {
      let markdown = '# Large Form\n\n';

      for (let i = 0; i < 10; i++) {
        markdown += `[-- Section ${i}
Email ${i} ___
Password ${i} __*
Role ${i} __> [Admin, User, Guest]
Status ${i} __> [Active, Inactive, Pending]
Remember me ${i} __[]
[(save ${i})][cancel ${i}]
--]

`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      }, '100-line form');

      // Should parse medium documents in under 100ms
      expect(time).toBeLessThan(100);
    });

    test('parses 500-line document with varied content', () => {
      let markdown = '';

      for (let i = 0; i < 100; i++) {
        markdown += `# Header ${i}
Text content for section ${i}
Email ${i} ___
Password ${i} __*
Role ${i} __> [Option1, Option2, Option3]
`;
      }

      const { result } = measureMemory(() => parser.parse(markdown), '500-line document');
      const time = measureTime(() => {
        parser.parse(markdown);
      }, '500-line document parse time');

      expect(result.nodes.length).toBeGreaterThan(400);
      expect(time).toBeLessThan(200);
    });

    test('parses large table (200 rows)', () => {
      let markdown = '| ID | Name | Email | Role | Status |\n|-----|------|-------|------|--------|\n';

      for (let i = 0; i < 200; i++) {
        markdown += `| ${i} | User${i} | user${i}@example.com | Admin | Active |\n`;
      }

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes[0].type).toBe('table');
        expect(result.nodes[0].rows?.length).toBe(200);
      }, 'Large table (200 rows)');

      expect(time).toBeLessThan(50);
    });

    test('parses 300 lines of grid layouts', () => {
      let markdown = '';

      for (let i = 0; i < 30; i++) {
        markdown += `[grid cols-3 gap-4
# Item ${i * 3 + 1}
# Item ${i * 3 + 2}
# Item ${i * 3 + 3}
]

`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(100);
    });

    test('parses 400 lines of button groups', () => {
      const markdown = repeat('[Submit][Cancel][Reset][Help]\n', 100);

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes.length).toBe(100);
      });

      expect(time).toBeLessThan(80);
    });
  });

  describe('Large Documents (1000+ lines)', () => {
    test('parses 1000-line complex document', () => {
      let markdown = '# Main Application\n\n';

      for (let i = 0; i < 200; i++) {
        markdown += `[-- Form Section ${i}
First Name ${i} ___
Last Name ${i} ___
Email ${i} ___
Role ${i} __> [Admin, User, Guest]
[(save)][cancel]
--]
`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      }, '1000-line complex document');

      // Large documents should parse in under 500ms
      expect(time).toBeLessThan(500);
    });

    test('parses 2000 lines of mixed content', () => {
      let markdown = '';

      for (let i = 0; i < 400; i++) {
        markdown += `# Section ${i}
Content for section ${i}
Email ___
Password __*
[(submit)]
`;
      }

      const { result, memoryUsed } = measureMemory(() => parser.parse(markdown), '2000-line document');

      expect(result.nodes.length).toBeGreaterThan(1500);
      // Memory should be reasonable (less than 50MB for 2000 lines)
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024);
    });

    test('parses very large table (1000 rows)', () => {
      let markdown = '| ID | Name | Email | Role | Status | Created |\n';
      markdown += '|-----|------|-------|------|--------|----------|\n';

      for (let i = 0; i < 1000; i++) {
        markdown += `| ${i} | User${i} | user${i}@example.com | Admin | Active | 2024-01-01 |\n`;
      }

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes[0].type).toBe('table');
        expect(result.nodes[0].rows?.length).toBe(1000);
      }, 'Very large table (1000 rows)');

      expect(time).toBeLessThan(200);
    });

    test('parses 1500 lines of nested grids', () => {
      let markdown = '';

      for (let i = 0; i < 100; i++) {
        markdown += `[grid cols-2 gap-4
[-- Card ${i * 2 + 1}
Content ${i * 2 + 1}
Email ___
--]
[-- Card ${i * 2 + 2}
Content ${i * 2 + 2}
Password __*
--]
]

`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(400);
    });
  });

  describe('Deeply Nested Structures', () => {
    test('handles 5-level nested cards efficiently', () => {
      let markdown = '';

      // Create 5 levels of nesting
      for (let i = 0; i < 5; i++) {
        markdown += `[-- Level ${i + 1}\n`;
      }

      markdown += 'Content at deepest level\nEmail ___\n';

      for (let i = 0; i < 5; i++) {
        markdown += '--]\n';
      }

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes.length).toBe(1);
      });

      expect(time).toBeLessThan(5);
    });

    test('handles 10-level nested cards', () => {
      let markdown = '';

      // Create 10 levels of nesting
      for (let i = 0; i < 10; i++) {
        markdown += `[-- Level ${i + 1}\n`;
      }

      markdown += 'Deep content\n';

      for (let i = 0; i < 10; i++) {
        markdown += '--]\n';
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(10);
    });

    test('handles deeply nested grids within cards', () => {
      const markdown = `[-- Outer Card
[grid cols-2 gap-4
[-- Inner Card 1
[grid cols-2 gap-2
Email ___
Password __*
]
--]
[-- Inner Card 2
[grid cols-2 gap-2
First Name ___
Last Name ___
]
--]
]
--]`;

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes[0].type).toBe('card');
      });

      expect(time).toBeLessThan(5);
    });

    test('handles multiple deeply nested structures in sequence', () => {
      let markdown = '';

      for (let i = 0; i < 20; i++) {
        markdown += `[-- Card ${i}
[grid cols-2 gap-4
[-- Nested ${i}A
Email ___
--]
[-- Nested ${i}B
Password __*
--]
]
--]

`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(50);
    });

    test('handles pathological nesting (15 levels)', () => {
      let markdown = '';

      // Mix different container types
      for (let i = 0; i < 15; i++) {
        if (i % 3 === 0) {
          markdown += `[-- Card ${i}\n`;
        } else if (i % 3 === 1) {
          markdown += `[grid cols-2 gap-4\n`;
        } else {
          markdown += `[ flex\n`;
        }
      }

      markdown += 'Deep content\n';

      for (let i = 0; i < 15; i++) {
        if (i % 3 === 0) {
          markdown += '--]\n';
        } else {
          markdown += ']\n';
        }
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      // Even pathological cases should complete reasonably fast
      expect(time).toBeLessThan(20);
    });
  });

  describe('Complex Tables', () => {
    test('parses wide table (20 columns, 100 rows)', () => {
      let markdown = '|';
      for (let i = 0; i < 20; i++) {
        markdown += ` Col${i} |`;
      }
      markdown += '\n|';
      for (let i = 0; i < 20; i++) {
        markdown += '------|';
      }
      markdown += '\n';

      for (let row = 0; row < 100; row++) {
        markdown += '|';
        for (let col = 0; col < 20; col++) {
          markdown += ` R${row}C${col} |`;
        }
        markdown += '\n';
      }

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes[0].headers?.length).toBe(20);
        expect(result.nodes[0].rows?.length).toBe(100);
      });

      expect(time).toBeLessThan(100);
    });

    test('parses multiple large tables in sequence', () => {
      let markdown = '';

      for (let t = 0; t < 10; t++) {
        markdown += `| Name | Email | Role |\n|------|-------|------|\n`;
        for (let i = 0; i < 50; i++) {
          markdown += `| User${i} | user${i}@example.com | Admin |\n`;
        }
        markdown += '\n';
      }

      const time = measureTime(() => {
        const result = parser.parse(markdown);
        expect(result.nodes.length).toBe(10);
      });

      expect(time).toBeLessThan(100);
    });

    test('parses table with long cell content', () => {
      const longText = 'A'.repeat(500);
      let markdown = '| Column1 | Column2 |\n|---------|----------|\n';

      for (let i = 0; i < 100; i++) {
        markdown += `| ${longText} | ${longText} |\n`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(100);
    });

    test('handles tables mixed with other complex structures', () => {
      let markdown = '';

      for (let i = 0; i < 20; i++) {
        markdown += `[-- Section ${i}
| Name | Value |
|------|-------|
| Field1 | Data1 |
| Field2 | Data2 |

Email ___
[(submit)]
--]

`;
      }

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      expect(time).toBeLessThan(100);
    });
  });

  describe('Regression Performance Tests', () => {
    test('parsing time scales linearly with document size', () => {
      const baseContent = `# Header
Email ___
Password __*
[(submit)]
`;

      const times: number[] = [];
      const sizes = [10, 50, 100, 200];

      sizes.forEach(size => {
        const markdown = repeat(baseContent, size);
        const time = measureTime(() => {
          parser.parse(markdown);
        });
        times.push(time);
      });

      // Check that time increases roughly linearly (not exponentially)
      // Time for 200x should be less than 25x the time for 10x
      const ratio = times[3] / times[0];
      expect(ratio).toBeLessThan(25);
    });

    test('memory usage is reasonable for repeated parses', () => {
      const markdown = repeat(`[-- Card
Email ___
Password __*
--]
`, 50);

      const initialMem = process.memoryUsage().heapUsed;

      // Parse 100 times
      for (let i = 0; i < 100; i++) {
        parser.parse(markdown);
      }

      if (global.gc) global.gc();

      const finalMem = process.memoryUsage().heapUsed;
      const memIncrease = finalMem - initialMem;

      // Memory increase should be reasonable (less than 100MB)
      expect(memIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('handles worst-case regex backtracking efficiently', () => {
      // Test patterns that could cause regex catastrophic backtracking
      const markdown = repeat('['.repeat(50) + ']'.repeat(50), 10);

      const time = measureTime(() => {
        parser.parse(markdown);
      });

      // Should not hang or take excessive time
      expect(time).toBeLessThan(50);
    });
  });

  describe('Parser Options Performance Impact', () => {
    test('preserveWhitespace option has minimal performance impact', () => {
      const markdown = repeat(`    Email ___
    Password __*
    [(submit)]
`, 100);

      const timeDefault = measureTime(() => {
        parser.parse(markdown);
      });

      const parserPreserve = new MarkdownParser({ preserveWhitespace: true });
      const timePreserve = measureTime(() => {
        parserPreserve.parse(markdown);
      });

      // Performance difference should be minimal (less than 2x)
      expect(timePreserve / timeDefault).toBeLessThan(2);
    });

    test('strict mode has minimal performance impact', () => {
      const markdown = repeat(`# Header
Email ___
Some invalid syntax here
Password __*
`, 50);

      const timeDefault = measureTime(() => {
        parser.parse(markdown);
      });

      const parserStrict = new MarkdownParser({ strict: true });
      const timeStrict = measureTime(() => {
        parserStrict.parse(markdown);
      });

      // Strict mode should not significantly impact performance
      expect(timeStrict / timeDefault).toBeLessThan(1.5);
    });
  });
});
