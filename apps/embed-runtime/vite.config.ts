import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Builds a self-contained ES module bundle with React INSIDE it.
 * Nothing is shared with the partner page, so the partner's own
 * React / Angular / Vue version can never conflict with ours.
 *
 * Output (immutable, cache forever):   dist/1.0.0/flarie.js + dist/1.0.0/chunks/*
 * Alias written by scripts/write-alias: dist/v1/flarie.js  (short cache)
 *
 * This is a normal app build (not lib mode) on purpose: it goes straight to
 * browsers, so we want full minification and React's production build.
 */
export default defineConfig({
  // Chunks are resolved relative to the entry file's URL, so the same build
  // works from any CDN path (/embed/1.0.0/, staging, localhost …).
  base: './',
  define: {
    __FLARIE_RUNTIME_VERSION__: JSON.stringify(version),
  },
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: `dist/${version}`,
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        format: 'es',
        entryFileNames: 'flarie.js',
        // Each public feature becomes its own lazy chunk (via the dynamic
        // import in registry.ts): a partner that only mounts `game-list`
        // never downloads analytics or survey code.
        chunkFileNames: (chunk) => {
          const feature = chunk.facadeModuleId?.match(/packages\/features\/src\/([^/]+)\//)?.[1];
          return feature ? `chunks/feature-${feature}-[hash].js` : 'chunks/[name]-[hash].js';
        },
      },
    },
  },
});
