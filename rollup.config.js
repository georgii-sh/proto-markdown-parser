import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// One Rollup config per public entry. Each entry has its own CJS + ESM
// output and emits its own .d.ts under dist/. Keeping the entries separate
// (rather than a single multi-input bundle) guarantees that an importer of
// `@protomarkdown/parser/html` never pulls in Shadcn code, and vice versa.
function buildConfig(input, outBaseName) {
  return {
    input,
    output: [
      {
        file: `dist/${outBaseName}.js`,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: `dist/${outBaseName}.esm.js`,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src',
      }),
    ],
    external: [],
  };
}

export default [
  buildConfig('src/index.ts', 'index'),
  buildConfig('src/shadcn.ts', 'shadcn'),
  buildConfig('src/html.ts', 'html'),
];
